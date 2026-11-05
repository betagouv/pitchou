import { isDeepStrictEqual } from "node:util";
import { writeRecord } from "../writer.mjs";
import {
  identity,
  assertPrivatePerson,
  assertPrivateOrganisation,
  assertPorteurRelationship,
} from "./identity.mjs";
import { writeCompany } from "./company.mjs";

async function resolvePorteur(client, proposal, previous, key, sourceKey, dossierId) {
  const results = [];
  let porteurId = null,
    personId = null,
    organisationId = null,
    siret = null;
  if (proposal?.type === "personne_morale") {
    results.push(await writeCompany(client, proposal));
    siret = proposal.siret;
    let link = (
      await client.query(
        "SELECT id FROM porteur_de_projet WHERE personne_morale=$1 ORDER BY id LIMIT 1",
        [siret],
      )
    ).rows[0];
    if (!link)
      link = (
        await client.query(
          "INSERT INTO porteur_de_projet (personne_morale) VALUES ($1) RETURNING id",
          [siret],
        )
      ).rows[0];
    porteurId = link.id;
  } else if (proposal?.type === "personne_physique") {
    const personKey = `${sourceKey}:person`;
    const person = await identity(client, key, personKey);
    if (person) await assertPrivatePerson(client, person.target_id, dossierId);
    const saved = await writeRecord(
      client,
      key,
      personKey,
      "personne_physique",
      proposal.values,
      {},
    );
    results.push(saved);
    personId = Number(saved.targetId);
    if (previous?.personId === personId) porteurId = previous.porteurId;
    else
      porteurId = (
        await client.query(
          "INSERT INTO porteur_de_projet (personne_physique) VALUES ($1) RETURNING id",
          [personId],
        )
      ).rows[0].id;
  } else if (proposal?.type === "organisation") {
    const organisationKey = `${sourceKey}:organisation`;
    const organisation = await identity(client, key, organisationKey);
    if (organisation) await assertPrivateOrganisation(client, organisation.target_id, dossierId);
    const saved = await writeRecord(
      client,
      key,
      organisationKey,
      "organisation",
      proposal.values,
      {},
    );
    results.push(saved);
    organisationId = Number(saved.targetId);
    if (previous?.organisationId === organisationId) porteurId = previous.porteurId;
    else
      porteurId = (
        await client.query(
          "INSERT INTO porteur_de_projet (organisation) VALUES ($1) RETURNING id",
          [organisationId],
        )
      ).rows[0].id;
  }
  return { results, porteurId, personId, organisationId, siret };
}

export async function writePorteur(client, sample, dossierId) {
  const proposal = sample.proposal.porteur;
  if (proposal === undefined) return [];
  const key = sample.identity.key,
    sourceKey = `${key}:porteur`;
  const owned = await identity(client, key, sourceKey);
  const current = (
    await client.query("SELECT porteur_de_projet FROM dossier WHERE id=$1 FOR UPDATE", [dossierId])
  ).rows[0];
  if (owned && (owned.table_name !== "dossier_porteur" || owned.target_id !== String(dossierId)))
    throw new Error("Porteur ownership changed");
  const previous = owned?.last_fields;
  // Verification metadata does not change the business identity or cause a conflict.
  const business =
    proposal &&
    Object.fromEntries(Object.entries(proposal).filter(([field]) => field !== "verification"));
  const result = {
    sourceKey,
    table: "dossier_porteur",
    targetId: String(dossierId),
    status: "unchanged",
    preserved: [],
  };
  if (current.porteur_de_projet !== (previous?.porteurId ?? null)) {
    if (previous && isDeepStrictEqual(previous.proposal, business)) {
      result.preserved.push("porteur_de_projet");
      return [result];
    }
    throw new Error("Porteur edited locally; reconcile before importing");
  }
  await assertPorteurRelationship(client, previous, key, sourceKey, dossierId);
  const { results, porteurId, personId, organisationId, siret } = await resolvePorteur(
    client,
    proposal,
    previous,
    key,
    sourceKey,
    dossierId,
  );
  if (porteurId !== current.porteur_de_projet) {
    await client.query("UPDATE dossier SET porteur_de_projet=$2 WHERE id=$1", [
      dossierId,
      porteurId,
    ]);
    result.status = owned ? "updated" : "created";
  }
  await client.query(
    `INSERT INTO onagre_local_import.identity (dossier_key,source_key,table_name,target_id,last_fields)
    VALUES ($1,$2,'dossier_porteur',$3,$4) ON CONFLICT (dossier_key,source_key) DO UPDATE SET last_fields=EXCLUDED.last_fields`,
    [
      key,
      sourceKey,
      String(dossierId),
      JSON.stringify({ proposal: business, porteurId, personId, organisationId, siret }),
    ],
  );
  return [...results, result];
}
