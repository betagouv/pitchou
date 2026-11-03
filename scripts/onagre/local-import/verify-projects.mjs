import assert from "node:assert/strict";
import { connect, initialize } from "./connection.mjs";
import { importSamples } from "./run.mjs";
import { projectForSample } from "./fixtures.mjs";
import { getReviewer } from "./routing.mjs";

const c = await connect(process.env);
try {
  await c.begin();
  await initialize(c);
  if (!process.argv[2]) throw new Error("Pass the local reviewer's email as the first argument");
  const reviewer = await getReviewer(c, process.argv[2]);
  const sourceId = String(Date.now());
  const project = projectForSample({
    formatVersion: 1,
    identity: {
      sourceInstance: "onagre-national",
      sourceTable: "demandes",
      sourceId,
      key: `onagre-national:demandes:${sourceId}`,
    },
    proposal: {
      dossier: {
        source: "onagre",
        name: "Synthetic project",
        onagre_demande_identifier: `group-test-${sourceId}`,
        depot_date: null,
        description: "First",
        primary_department: "21",
        departments: ["21"],
      },
      records: [],
    },
  });
  const sibling = structuredClone(project.demandes[0]);
  sibling.identity.sourceId = String(BigInt(sourceId) + 1n);
  sibling.identity.key = `onagre-national:demandes:${sibling.identity.sourceId}`;
  sibling.label = "Second demande";
  Object.assign(sibling.proposal.dossier, {
    description: "Second",
    onagre_demande_identifier: `group-test-${sibling.identity.sourceId}`,
    primary_department: "71",
    departments: ["71"],
  });
  project.demandes.push(sibling);
  const groups = await c
    .trx("groupe_instructeurs")
    .insert([{ name: `Synthetic 21 ${sourceId}` }, { name: `Synthetic 71 ${sourceId}` }])
    .returning("id");
  await c.trx("group_routing_rule").insert(
    groups.map((group, index) => ({
      groupe_instructeurs: group.id,
      departments: [index ? "71" : "21"],
    })),
  );
  await c
    .trx("user_groupe")
    .insert(groups.map((group) => ({ user_id: reviewer.id, groupe_instructeurs: group.id })));
  const beforeMail = await c.trx("email_notification_outbox").count("*").first();
  const run = (input = project) => importSamples(c, [input], reviewer.email);
  const first = await run();
  assert.equal(first.length, 2);
  assert.equal(first[0].projectId, first[1].projectId);
  const ids = first.map((row) => row.dossierId);
  assert.equal((await c.trx("dossier_demande").where({ projet: first[0].projectId })).length, 2);
  for (const id of ids)
    assert.equal(
      (
        await c
          .trx("edge_groupe_instructeurs__dossier")
          .where({ dossier: id })
          .whereIn(
            "groupe_instructeurs",
            groups.map((g) => g.id),
          )
      ).length,
      2,
    );
  assert.deepEqual(await c.trx("email_notification_outbox").count("*").first(), beforeMail);
  const replay = await run();
  assert.deepEqual(
    replay.map((row) => [row.projectId, row.dossierId]),
    first.map((row) => [row.projectId, row.dossierId]),
  );
  assert(
    replay.every(
      (row) =>
        row.projectOutcome.status === "unchanged" &&
        row.outcomes.every((item) => item.status === "unchanged"),
    ),
  );
  project.proposal.name = "Corrected project title";
  project.demandes[1].label = "Corrected label";
  project.demandes[1].proposal.dossier.description = "Corrected second demande";
  const changed = await run();
  assert.equal(changed[0].projectOutcome.status, "updated");
  for (const id of ids)
    assert.equal((await c.trx("dossier").where({ id }).first()).name, "Corrected project title");
  assert.equal((await c.trx("dossier").where({ id: ids[0] }).first()).description, "First");
  assert.equal(
    (await c.trx("dossier").where({ id: ids[1] }).first()).description,
    "Corrected second demande",
  );
  await c.trx("dossier_demande").where({ dossier: ids[1] }).update({ label: "Manual label" });
  await c
    .trx("dossier_projet")
    .where({ id: first[0].projectId })
    .update({ name: "Manual project" });
  await c
    .trx("edge_personne_follows_dossier")
    .where({ dossier: ids[0], personne: reviewer.id })
    .delete();
  const preserved = await run();
  assert(
    preserved[1].outcomes
      .find((row) => row.table === "dossier_demande")
      .preserved.includes("label"),
  );
  assert(preserved[0].projectOutcome.preserved.includes("name"));
  assert.equal(
    (await c.trx("edge_personne_follows_dossier").where({ dossier: ids[0], personne: reviewer.id }))
      .length,
    0,
  );
  await c
    .trx("dossier_group_override")
    .insert(
      ids.map((dossier) => ({ dossier, groupe_instructeurs: groups[0].id, mode: "exclude" })),
    );
  await run();
  assert.equal(
    (
      await c
        .trx("edge_groupe_instructeurs__dossier")
        .whereIn("dossier", ids)
        .where({ groupe_instructeurs: groups[0].id })
    ).length,
    0,
  );
  assert.equal((await c.trx("dossier_group_override").whereIn("dossier", ids)).length, 2);
  const conflict = structuredClone(project);
  conflict.demandes[0].proposal.dossier.description = "Must roll back";
  conflict.demandes[1].label = "Source conflict";
  await c.query("SAVEPOINT conflicting_label");
  await assert.rejects(() => run(conflict), /Conflict for demande label/u);
  await c.query("ROLLBACK TO SAVEPOINT conflicting_label");
  assert.equal((await c.trx("dossier").where({ id: ids[0] }).first()).description, "First");
  const reduced = structuredClone(project);
  reduced.demandes.pop();
  await run(reduced);
  assert.equal((await c.trx("dossier_demande").where({ projet: first[0].projectId })).length, 2);
  await c.query("SAVEPOINT revoked_review");
  await c.trx("dossier_user_access").where({ dossier: ids[0], user_id: reviewer.id }).delete();
  await assert.rejects(() => run(), /reviewer grant was changed/u);
  await c.query("ROLLBACK TO SAVEPOINT revoked_review");
  console.log(
    "Passed project checks: independent demandes, stable group and demande IDs, shared rule routing, silent notifications, corrections, local labels/titles/unfollows, explicit exclusions, rollback on conflicts, retained missing demandes and refused grant restoration. All writes rolled back.",
  );
} finally {
  await c.finish(false);
  await c.end();
}
