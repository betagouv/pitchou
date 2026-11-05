import assert from "node:assert/strict";

function organisationFixture(template) {
  const sample = structuredClone(template);
  sample.identity.sourceId += "2";
  sample.identity.key += "2";
  sample.proposal.dossier.onagre_demande_identifier += "2";
  sample.proposal.porteur = {
    type: "organisation",
    values: {
      name: "Synthetic association",
      address: "Historical address",
      siren: null,
      verification_status: "source_declared",
      source: "onagre-national",
      source_reference: "projet:123:precisionpetitionnaire",
      verification_evidence: null,
    },
  };
  return sample;
}

export async function verifyOrganisations(client, template, run) {
  const sample = organisationFixture(template);
  const first = await run(sample);
  const organisation = first.outcomes.find((row) => row.table === "organisation");
  const person = first.outcomes.find((row) => row.table === "personne_physique");
  const link = async (dossierId) =>
    (
      await client.query(
        "SELECT p.* FROM dossier d JOIN porteur_de_projet p ON p.id=d.porteur_de_projet WHERE d.id=$1",
        [dossierId],
      )
    ).rows[0];
  const porteur = await link(first.dossierId);
  assert.equal(String(porteur.organisation), organisation.targetId);
  assert.equal(porteur.personne_morale, null);
  const replay = await run(sample);
  assert.deepEqual(
    first.outcomes.map((row) => row.targetId),
    replay.outcomes.map((row) => row.targetId),
  );
  assert(replay.outcomes.every((row) => row.status === "unchanged"));

  // Same source declaration in another demande creates an independent identity.
  const sibling = structuredClone(sample);
  sibling.identity.sourceId += "1";
  sibling.identity.key += "1";
  sibling.proposal.dossier.onagre_demande_identifier += "1";
  const other = await run(sibling);
  const otherOrganisation = other.outcomes.find((row) => row.table === "organisation");
  assert.notEqual(otherOrganisation.targetId, organisation.targetId);
  assert.notEqual((await link(other.dossierId)).id, porteur.id);
  assert.notEqual(
    other.outcomes.find((row) => row.table === "personne_physique").targetId,
    person.targetId,
  );

  sample.proposal.porteur.values.address = "Corrected historical address";
  assert.equal(
    (await run(sample)).outcomes.find((row) => row.table === "organisation").status,
    "updated",
  );
  assert.equal((await link(first.dossierId)).id, porteur.id);
  const context = {
    client,
    template,
    run,
    sample,
    sibling,
    first,
    other,
    organisation,
    otherOrganisation,
    person,
    porteur,
    link,
  };
  await verifyLocalChanges(context);
  await verifyUpgrade(context);
  console.log(
    "Passed PostgreSQL organisation checks: independent declarations and verified SIRENs, stable replay, corrections, local edits/conflicts, relationship and ownership protection, shared identity refusal, verified SIRET upgrade, retained provenance and unchanged contacts. Fixtures rolled back.",
  );
}

async function verifyLocalChanges({
  client,
  run,
  sample,
  other,
  organisation,
  otherOrganisation,
  person,
  porteur,
}) {
  await client.query("UPDATE organisation SET name='Manual name' WHERE id=$1", [
    organisation.targetId,
  ]);
  assert(
    (await run(sample)).outcomes
      .find((row) => row.table === "organisation")
      .preserved.includes("name"),
  );
  async function rejected(value, pattern, mutate) {
    await client.query("SAVEPOINT organisation_check");
    try {
      if (mutate) await mutate();
      await assert.rejects(() => run(value), pattern);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT organisation_check");
    }
  }
  const conflict = structuredClone(sample);
  conflict.proposal.porteur.values.name = "Conflicting source name";
  conflict.proposal.contacts[0].values.phone = "Must roll back";
  await rejected(conflict, /Conflict/u);
  assert.notEqual(
    (await client.query("SELECT phone FROM personne_physique WHERE id=$1", [person.targetId]))
      .rows[0].phone,
    "Must roll back",
  );
  await rejected(sample, /relationship changed/u, () =>
    client.query("UPDATE porteur_de_projet SET organisation=$2 WHERE id=$1", [
      porteur.id,
      Number(otherOrganisation.targetId),
    ]),
  );
  await rejected(sample, /shared/u, () =>
    client.query("UPDATE dossier SET porteur_de_projet=$2 WHERE id=$1", [
      other.dossierId,
      porteur.id,
    ]),
  );
  await rejected(sample, /ownership changed/u, () =>
    client.query(
      "DELETE FROM onagre_local_import.identity WHERE dossier_key=$1 AND table_name='organisation'",
      [sample.identity.key],
    ),
  );
}

async function verifyUpgrade({
  client,
  template,
  run,
  sample,
  sibling,
  first,
  other,
  organisation,
  person,
  porteur,
  link,
}) {
  // Verification adds provenance to this demande only, even with identical SIRENs.
  Object.assign(sample.proposal.porteur.values, {
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Synthetic official registry match",
  });
  await run(sample);
  Object.assign(sibling.proposal.porteur.values, {
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Independent synthetic registry match",
  });
  await run(sibling);
  assert.equal((await link(first.dossierId)).id, porteur.id);
  assert.notEqual((await link(other.dossierId)).organisation, porteur.organisation);
  const beforeUpgrade = (
    await client.query("SELECT * FROM organisation WHERE id=$1", [organisation.targetId])
  ).rows[0];
  sample.proposal.porteur = structuredClone(template.proposal.porteur);
  const upgraded = await run(sample);
  assert.equal((await link(first.dossierId)).personne_morale, template.proposal.porteur.siret);
  assert.equal((await link(first.dossierId)).organisation, null);
  assert.equal(
    upgraded.outcomes.find((row) => row.table === "personne_physique").targetId,
    person.targetId,
  );
  assert(upgraded.retainedRemovedRecords.includes(organisation.sourceKey));
  assert.deepEqual(
    (await client.query("SELECT * FROM organisation WHERE id=$1", [organisation.targetId])).rows[0],
    beforeUpgrade,
  );
  assert((await run(sample)).outcomes.every((row) => row.status === "unchanged"));
}
