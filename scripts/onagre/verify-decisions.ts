import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { applyReviewedDecisions, type ReviewedDecision } from "./reviewedDecisions.ts";
import { saveMapping } from "@pitchou/server/onagre/mappings.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
try {
  const manifest = JSON.parse(
    await readFile(new URL("./reviewed-decisions.json", import.meta.url), "utf8"),
  ) as { entries: ReviewedDecision[] };
  assert.equal(manifest.entries.length, 190);
  assert.equal(new Set(manifest.entries.map((entry) => entry.key)).size, 190);
  for (const entry of manifest.entries) {
    assert.ok(entry.decision.notes.startsWith(entry.expected.notes.trim()));
    assert.ok(["review", "discuss"].includes(entry.decision.status));
    const form = new FormData();
    for (const [key, value] of Object.entries({
      ...entry.decision,
      key: entry.key,
      version: entry.expected.version,
    }))
      form.set(key, String(value));
    parseDecision(form);
  }
  // Every concrete destination mentioned in a draft must exist in the current schema.
  const columns = new Set(
    (
      await db("information_schema.columns")
        .where({ table_schema: "public" })
        .select("table_name", "column_name")
    ).map((c) => `${c.table_name}.${c.column_name}`),
  );
  for (const entry of manifest.entries) {
    for (const [column] of entry.decision.target.matchAll(/\b[a-z_]+\.[a-z_]+\b/gu))
      assert.ok(columns.has(column), `${entry.key}: ${column}`);
  }
  await db.transaction(async (trx) => {
    const [actor] = await trx("auth_user")
      .insert({ email: "onagre-draft-check@localhost.local", active: true })
      .returning("id");
    const key = "test:reviewed-draft";
    const expected = {
      version: 1,
      proposal: "Titre",
      context: "Nom du projet",
      status: "todo" as const,
      target: "",
      rule: "",
      notes: "Question initiale",
    };
    const entry: ReviewedDecision = {
      key,
      expected,
      decision: {
        status: "review",
        target: "dossier.name",
        rule: "Copier le titre.",
        notes: "Question initiale\n\nVérifier les titres vides.",
      },
    };
    await trx("onagre_mapping").insert({
      key,
      section: "projet",
      label: "nomprojet",
      confidence: "fort",
      ...expected,
    });
    assert.equal((await applyReviewedDecisions(trx, [entry])).prepared, 1);
    assert.equal((await trx("onagre_mapping").where({ key }).first()).version, 1);
    assert.equal((await applyReviewedDecisions(trx, [entry], actor.id)).prepared, 1);
    assert.equal((await trx("onagre_mapping").where({ key }).first()).status, "review");
    assert.equal((await applyReviewedDecisions(trx, [entry], actor.id)).unchanged, 1);
    const revisions = await trx("onagre_mapping_revision").where({ mapping_key: key });
    assert.equal(revisions.length, 1);
    assert.equal(revisions[0].before.proposal, "Titre");
    assert.equal(revisions[0].after.proposal, "Titre");
    await saveMapping(trx, actor.id, {
      key,
      version: 2,
      status: "discuss",
      target: "",
      rule: "",
      notes: "Revoir le choix",
    });
    assert.deepEqual((await applyReviewedDecisions(trx, [entry], actor.id)).skipped, [key]);
    assert.equal((await trx("onagre_mapping").where({ key }).first()).notes, "Revoir le choix");
    const mismatched = { ...entry, expected: { ...expected, version: 3 } };
    assert.deepEqual((await applyReviewedDecisions(trx, [mismatched], actor.id)).skipped, [key]);
    await assert.rejects(applyReviewedDecisions(trx, [entry, entry], actor.id), /Duplicate/u);
    assert.deepEqual(
      (await applyReviewedDecisions(trx, [{ ...entry, key: "test:missing" }], actor.id)).skipped,
      ["test:missing"],
    );
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    "Reviewed decisions verified: complete coverage, schema destinations, preview, replay, preserved source/notes, edits and audit history. Fixtures rolled back.",
  );
} finally {
  await db.destroy();
}
