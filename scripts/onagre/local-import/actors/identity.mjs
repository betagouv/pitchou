export async function identity(client, key, sourceKey) {
  return (
    await client.query(
      "SELECT * FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$2 FOR UPDATE",
      [key, sourceKey],
    )
  ).rows[0];
}
export async function assertPrivatePerson(client, personId, dossierId) {
  const other = await client.query(
    `SELECT 1 FROM dossier_acteur WHERE personne_physique=$1 AND dossier<>$2
    UNION ALL SELECT 1 FROM porteur_de_projet p JOIN dossier d ON d.porteur_de_projet=p.id
    WHERE p.personne_physique=$1 AND d.id<>$2`,
    [personId, dossierId],
  );
  if (other.rows.length > 0)
    throw new Error(
      "Imported person is now shared with another demande; reconcile before importing",
    );
}

export async function assertPrivateOrganisation(client, organisationId, dossierId) {
  const other = await client.query(
    `SELECT 1 FROM porteur_de_projet p JOIN dossier d ON d.porteur_de_projet=p.id
    WHERE p.organisation=$1 AND d.id<>$2`,
    [organisationId, dossierId],
  );
  if (other.rows.length > 0)
    throw new Error(
      "Imported organisation is now shared with another demande; reconcile before importing",
    );
}

export async function assertPorteurRelationship(client, previous, key, sourceKey, dossierId) {
  if (!previous?.porteurId) return;
  const link = (
    await client.query("SELECT * FROM porteur_de_projet WHERE id=$1 FOR UPDATE", [
      previous.porteurId,
    ])
  ).rows[0];
  if (
    !link ||
    link.personne_morale !== previous.siret ||
    link.personne_physique !== previous.personId ||
    link.organisation !== (previous.organisationId ?? null)
  )
    throw new Error("Imported porteur relationship changed");
  if (previous.organisationId) {
    const organisation = await identity(client, key, `${sourceKey}:organisation`);
    if (
      organisation?.table_name !== "organisation" ||
      organisation.target_id !== String(previous.organisationId)
    )
      throw new Error("Imported organisation ownership changed; reconcile before importing");
    await assertPrivateOrganisation(client, previous.organisationId, dossierId);
  }
}
