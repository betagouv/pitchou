import assert from "node:assert/strict";
import { connect, initialize } from "./connection.mjs";
import { importSamples } from "./run.mjs";
import { projectForSample } from "./fixtures.mjs";
import { disposableClient, seedReviewer } from "./disposable.mjs";
import { verifyOrganisations } from "./actors/verify-organisations.mjs";
const disposable = process.argv[2] === "--disposable";
const email = disposable ? "actors-verifier@example.test" : process.argv[2];
const client = disposable ? await disposableClient() : await connect(process.env);
try {
  if (!email) throw new Error("Pass the local reviewer's email or --disposable");
  await client.begin();
  await initialize(client);
  if (disposable) await seedReviewer(client, email);
  const sourceId = String(Date.now()),
    key = `onagre-national:demandes:${sourceId}`;
  const siret = sourceId.padStart(14, "0");
  const person = {
    first_names: "Camille",
    last_name: "Exemple",
    email: "camille@example.test",
    address: null,
    phone: null,
    role: "Direction",
  };
  const sample = {
    formatVersion: 1,
    identity: { sourceInstance: "onagre-national", sourceTable: "demandes", sourceId, key },
    proposal: {
      dossier: {
        source: "onagre",
        onagre_demande_identifier: `synthetic-actors-${sourceId}`,
        name: "Synthetic actors",
        depot_date: null,
      },
      records: [],
      contacts: [{ sourceKey: `${key}:applicant`, values: person }],
      porteur: {
        type: "personne_morale",
        siret,
        values: {
          legal_name: "Synthetic organisation",
          address: "Historical address",
          postal_code: "75001",
          insee_code: "75056",
        },
        verification: {
          status: "verified",
          reason: "Synthetic fixture",
          sources: ["https://example.test/registry"],
        },
      },
    },
    issues: [],
  };
  const run = async (value = sample) =>
    (await importSamples(client, [projectForSample(value)], email))[0];
  const first = await run(),
    second = await run();
  assert.deepEqual(
    first.outcomes.map((x) => x.targetId),
    second.outcomes.map((x) => x.targetId),
  );
  assert(second.outcomes.every((x) => x.status === "unchanged"));
  const personId = first.outcomes.find((x) => x.table === "personne_physique").targetId;
  const actorId = first.outcomes.find((x) => x.table === "dossier_acteur").targetId;
  const porteurId = (
    await client.query("SELECT porteur_de_projet FROM dossier WHERE id=$1", [first.dossierId])
  ).rows[0].porteur_de_projet;
  sample.proposal.contacts[0].values.phone = "0102030405";
  sample.proposal.porteur.values.legal_name = "Corrected synthetic organisation";
  const corrected = await run();
  assert.equal(corrected.outcomes.find((x) => x.table === "personne_physique").targetId, personId);
  assert.equal(corrected.outcomes.filter((x) => x.status === "updated").length, 2);
  const sibling = structuredClone(sample);
  sibling.identity.sourceId += "1";
  sibling.identity.key += "1";
  sibling.proposal.dossier.onagre_demande_identifier += "1";
  const other = await run(sibling);
  assert.equal(
    (await client.query("SELECT porteur_de_projet FROM dossier WHERE id=$1", [other.dossierId]))
      .rows[0].porteur_de_projet,
    porteurId,
  );
  assert.notEqual(other.outcomes.find((x) => x.table === "personne_physique").targetId, personId);
  await client.query("UPDATE personne_physique SET role='Manual role' WHERE id=$1", [personId]);
  assert(
    (await run()).outcomes.find((x) => x.table === "personne_physique").preserved.includes("role"),
  );
  async function rejected(value, pattern, mutate) {
    await client.query("SAVEPOINT actors_check");
    try {
      if (mutate) await mutate();
      await assert.rejects(() => run(value), pattern);
    } finally {
      await client.query("ROLLBACK TO SAVEPOINT actors_check");
    }
  }
  const conflict = structuredClone(sample);
  conflict.proposal.contacts[0].values.role = "Conflicting role";
  await rejected(conflict, /Conflict/u);
  await rejected(sample, /deleted or reassigned/u, () =>
    client.query("DELETE FROM dossier_acteur WHERE id=$1", [actorId]),
  );
  await rejected(sample, /deleted or reassigned/u, () =>
    client.query("UPDATE dossier_acteur SET dossier=$2 WHERE id=$1", [actorId, other.dossierId]),
  );
  await rejected(sample, /shared/u, () =>
    client.query(
      "INSERT INTO dossier_acteur (dossier,personne_physique,involvement) VALUES ($1,$2,'personne_contact')",
      [other.dossierId, personId],
    ),
  );
  const removed = structuredClone(sample);
  removed.proposal.contacts = [];
  assert((await run(removed)).retainedRemovedRecords.includes(`${key}:applicant:contact`));
  const physical = structuredClone(sample);
  physical.proposal.porteur = {
    type: "personne_physique",
    values: { ...person, last_name: "Physical porteur" },
  };
  await run(physical);
  assert((await run(physical)).outcomes.every((x) => x.status === "unchanged"));
  const physicalId = (
    await client.query(
      "SELECT p.personne_physique FROM dossier d JOIN porteur_de_projet p ON p.id=d.porteur_de_projet WHERE d.id=$1",
      [first.dossierId],
    )
  ).rows[0].personne_physique;
  assert.notEqual(String(physicalId), personId);
  // A manual replacement survives unchanged replay, even after the orphan trigger removes the old porteur.
  await client.query("UPDATE dossier SET porteur_de_projet=$2 WHERE id=$1", [
    first.dossierId,
    porteurId,
  ]);
  assert(
    (await run(physical)).outcomes
      .find((x) => x.table === "dossier_porteur")
      .preserved.includes("porteur_de_projet"),
  );
  const physicalConflict = structuredClone(physical);
  physicalConflict.proposal.porteur.values.last_name = "Other person";
  await rejected(physicalConflict, /edited locally/u);
  // An existing enterprise is reused without overwriting its independently maintained metadata.
  const existingSiret = siret.slice(0, -1) + ((Number(siret.at(-1)) + 1) % 10);
  await client.query(
    "INSERT INTO entreprise (siret,legal_name) VALUES ($1,'Existing legal name')",
    [existingSiret],
  );
  const existing = structuredClone(sibling);
  existing.proposal.porteur.siret = existingSiret;
  await run(existing);
  assert.equal(
    (await client.query("SELECT legal_name FROM entreprise WHERE siret=$1", [existingSiret]))
      .rows[0].legal_name,
    "Existing legal name",
  );
  await verifyOrganisations(client, sample, run);
  console.log(
    "Passed PostgreSQL actor checks: stable replay, shared SIRET porteurs, separate persons, corrections, local-edit preservation/conflicts, deleted/reassigned/shared-person protection, retained contacts, physical porteurs, unowned company preservation. All fixtures rolled back.",
  );
} finally {
  await client.end();
}
