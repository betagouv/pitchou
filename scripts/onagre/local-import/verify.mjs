import assert from "node:assert/strict";
import { connect, initialize } from "./connection.mjs";
import { importSamples } from "./run.mjs";
const client = await connect(process.env);
try {
  await client.query("BEGIN");
  await initialize(client);
  const reviewer = (
    await client.query(
      "SELECT email FROM auth_user WHERE active AND pitchou_can_instruct(id) AND EXISTS (SELECT 1 FROM user_groupe WHERE user_id=auth_user.id) ORDER BY id LIMIT 1",
    )
  ).rows[0];
  assert(reviewer);
  const sourceId = String(Date.now()),
    key = `onagre-national:demandes:${sourceId}`;
  const sample = {
    formatVersion: 1,
    identity: { sourceInstance: "onagre-national", sourceTable: "demandes", sourceId, key },
    proposal: {
      dossier: {
        source: "onagre",
        onagre_demande_identifier: `synthetic-${sourceId}`,
        name: "Synthetic import test",
        depot_date: null,
        ddep_depot_date: "2020-02-01",
        description: null,
      },
      records: [
        {
          table: "decision_administrative",
          sourceKey: key + ":decision",
          values: { type: "Arrêté dérogation", signature_date: "2020-03-01" },
        },
        {
          table: "prescription",
          sourceKey: key + ":prescription",
          parentSourceKey: key + ":decision",
          values: { description: "Synthetic prescription", due_date: null },
        },
        {
          table: "commentaire",
          sourceKey: key + ":comment",
          values: { content: "Synthetic source comment" },
        },
        {
          table: "evenement_phase_dossier",
          sourceKey: key + ":phase",
          values: { phase: "Contrôle", timestamp: "2020-03-01T00:00:00.000Z" },
        },
      ],
    },
    issues: [],
  };
  const run = async (value = sample) => (await importSamples(client, [value], reviewer.email))[0];
  const first = await run();
  assert.equal(first.outcomes.filter((o) => o.status === "created").length, 5);
  const second = await run();
  assert.equal(first.dossierId, second.dossierId);
  assert(second.outcomes.every((o) => o.status === "unchanged"));
  assert.deepEqual(
    first.outcomes.map((o) => o.targetId),
    second.outcomes.map((o) => o.targetId),
  );
  sample.proposal.dossier.ddep_depot_date = "2020-02-02";
  sample.proposal.records[1].values.description = "Corrected prescription";
  sample.proposal.records[3].values.timestamp = "2020-03-02T00:00:00.000Z";
  const changed = await run();
  assert.equal(changed.outcomes.filter((o) => o.status === "updated").length, 3);
  assert.equal(
    (await client.query("SELECT ddep_depot_date FROM dossier WHERE id=$1", [first.dossierId]))
      .rows[0].ddep_depot_date,
    "2020-02-02",
  );
  await client.query("UPDATE dossier SET name=$2 WHERE id=$1", [first.dossierId, "Manual title"]);
  const preserved = await run();
  assert.deepEqual(preserved.outcomes[0].preserved, ["name"]);
  await client.query("SAVEPOINT conflict");
  const conflict = structuredClone(sample);
  conflict.proposal.dossier.name = "Conflicting source";
  await assert.rejects(() => run(conflict), /Conflict/u);
  await client.query("ROLLBACK TO SAVEPOINT conflict");
  assert.equal(
    (await client.query("SELECT name FROM dossier WHERE id=$1", [first.dossierId])).rows[0].name,
    "Manual title",
  );
  const child = first.outcomes.find((o) => o.table === "prescription");
  await client.query("UPDATE prescription SET description=$2 WHERE id=$1", [
    child.targetId,
    "Manual prescription",
  ]);
  const childConflict = structuredClone(sample);
  childConflict.proposal.dossier.description = "Must roll back";
  childConflict.proposal.records[1].values.description = "Conflicting child";
  await client.query("SAVEPOINT child_conflict");
  await assert.rejects(() => run(childConflict), /Conflict/u);
  await client.query("ROLLBACK TO SAVEPOINT child_conflict");
  assert.equal(
    (await client.query("SELECT description FROM dossier WHERE id=$1", [first.dossierId])).rows[0]
      .description,
    null,
  );
  await client.query("INSERT INTO commentaire (dossier,content) VALUES ($1,$2)", [
    first.dossierId,
    "Unowned manual comment",
  ]);
  const removed = structuredClone(sample);
  removed.proposal.records = removed.proposal.records.filter((r) => r.table !== "commentaire");
  assert((await run(removed)).retainedRemovedRecords.includes(key + ":comment"));
  assert.equal(
    Number(
      (await client.query("SELECT count(*) FROM commentaire WHERE dossier=$1", [first.dossierId]))
        .rows[0].count,
    ),
    2,
  );
  const duplicate = structuredClone(sample);
  duplicate.identity.sourceId += "1";
  duplicate.identity.key += "1";
  await assert.rejects(() => run(duplicate), /unowned dossier/u);
  console.log(
    "Passed PostgreSQL checks: stable dossier and child IDs, replay, field and phase updates, local edits, parent/child conflicts, transaction rollback, retained removals, unowned rows, duplicate refusal. All test data rolled back.",
  );
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
