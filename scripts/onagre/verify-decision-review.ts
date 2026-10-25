import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Knex } from "../../libs/database/node_modules/knex/types/index.d.ts";
import { createFixture } from "./transfer/fixtures.ts";
import { applyDecisionReview } from "./review-decisions/apply.ts";
import manifest from "./review-decisions/entries.json" with { type: "json" };
import type { DecisionReview, ReviewEntry } from "./review-decisions/types.ts";

const fixture = await createFixture();
const knex = createRequire(new URL("../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;
const db = knex({ client: "pg", connection: fixture.targetUrl });
const review = manifest as DecisionReview;
const apply = (entries: ReviewEntry[], actor?: number) =>
  db.transaction((trx) => applyDecisionReview(trx, { ...review, entries }, actor));
const count = async (table: string) => Number((await db(table).count("* as n").first())!.n);
try {
  await db.schema.createTable("activite", (table) => table.string("code").primary());
  const codes = [
    ...new Set(
      review.entries.flatMap((e) => (e.decision.activity_code ? [e.decision.activity_code] : [])),
    ),
  ];
  await db("activite").insert(codes.map((code) => ({ code })));
  await db("onagre_snapshot").insert({
    fingerprint: review.snapshotFingerprint,
    workbook_fingerprint: review.workbookFingerprint,
    filename: "review fixture",
    tables: "[]",
    workbook_mappings: "[]",
  });
  const initial = review.entries.map((e) => ({
    ...e.expected,
    key: e.key,
    section: e.key.split(/[:.]/u)[1],
    label: e.key,
  }));
  await db("onagre_mapping").insert(initial);
  await db("onagre_mapping").insert({
    key: "owner-decision",
    context: "",
    proposal: "",
    confidence: "",
    section: "test",
    label: "owner",
    status: "validated",
    version: 2,
    target: "dossier.name",
    rule: "Preserve",
  });
  const owner = await db("onagre_mapping").where({ key: "owner-decision" }).first();
  const preview = await apply(review.entries);
  assert.equal(preview.changed.length, 464);
  assert.equal(await count("onagre_mapping_revision"), 0);
  assert.equal(
    (await db("onagre_mapping").where({ key: initial[0].key }).first()).status,
    initial[0].status,
  );
  const result = await apply(review.entries, 40);
  assert.equal(result.changed.length, 464);
  assert.equal(await count("onagre_mapping_revision"), 464);
  assert.equal(await count("dossier"), 0);
  assert.equal(await count("onagre_import_run"), 0);
  assert.deepEqual(await db("onagre_mapping").where({ key: "owner-decision" }).first(), owner);
  const history = await db("onagre_mapping_revision")
    .where({ mapping_key: initial[0].key })
    .first();
  assert.equal(history.actor_id, 40);
  assert.equal(history.before.version, initial[0].version);
  assert.equal(history.after.version, initial[0].version + 1);
  const repeated = await apply(review.entries, 40);
  assert.equal(repeated.changed.length, 0);
  assert.equal(repeated.unchanged.length, 464);
  assert.equal(await count("onagre_mapping_revision"), 464);
  const draft = review.entries.find((e) => e.origin === "schema-inference")!;
  await db("onagre_mapping")
    .where({ key: draft.key })
    .update({
      ...draft.expected,
      version: draft.expected.version + 1,
      notes: "Concurrent owner edit",
    });
  assert.deepEqual((await apply([draft], 40)).skipped, [draft.key]);
  assert.equal(
    (await db("onagre_mapping").where({ key: draft.key }).first()).notes,
    "Concurrent owner edit",
  );
  await db("onagre_mapping")
    .where({ key: draft.key })
    .update({ ...draft.expected, status: "validated", version: draft.expected.version + 1 });
  assert.deepEqual((await apply([draft], 40)).skipped, [draft.key]);
  await assert.rejects(
    apply([{ ...draft, decision: { ...draft.decision, status: "validated" } }], 40),
    /Inferences must remain drafts/u,
  );
  await assert.rejects(apply([draft, draft], 40), /Invalid decision review/u);
  await assert.rejects(apply([draft], 999), /actor is not active/u);
  await assert.rejects(
    db.transaction((trx) =>
      applyDecisionReview(trx, { ...review, snapshotFingerprint: "f".repeat(64) }, 40),
    ),
    /snapshot is absent/u,
  );
  // Deliberately fail the second write to verify the first write and its audit row roll back.
  const activity = review.entries.find((e) => e.decision.activity_code)!;
  for (const entry of [draft, activity])
    await db("onagre_mapping").where({ key: entry.key }).update(entry.expected);
  await assert.rejects(
    apply(
      [draft, { ...activity, decision: { ...activity.decision, activity_code: "missing" } }],
      40,
    ),
    /activité n'existe plus/u,
  );
  assert.equal(
    (await db("onagre_mapping").where({ key: draft.key }).first()).version,
    draft.expected.version,
  );
  assert.equal(await count("onagre_mapping_revision"), 464);
  console.log(
    "PASS: full manifest preview/apply, 464 audit revisions, preserved owner decision, no dossier writes, replay, stale edits, inference approval refusal, source/actor guards and deliberate invalid-activity rollback",
  );
} finally {
  await db.destroy();
  await fixture.cleanup();
}
