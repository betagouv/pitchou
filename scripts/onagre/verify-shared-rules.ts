import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { parseSharedRule, saveSharedRule } from "@pitchou/server/onagre/sharedRules.ts";
import { applyReviewedDecisions, type ReviewedDecision } from "./reviewedDecisions.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
function verifyInvalidRule(form: FormData) {
  form.set("status", "excluded");
  assert.throws(() => parseSharedRule(form), /invalide/u);
  form.set("status", "review");
  form.set("rule", " ");
  assert.throws(() => parseSharedRule(form), /Précisez/u);
  form.set("rule", "A".repeat(20001));
  assert.throws(() => parseSharedRule(form), /invalide/u);
}
try {
  const original = JSON.parse(
    await readFile(new URL("./reviewed-decisions.json", import.meta.url), "utf8"),
  ) as { entries: ReviewedDecision[] };
  const concise = JSON.parse(
    await readFile(new URL("./concise-decisions.json", import.meta.url), "utf8"),
  ) as { entries: ReviewedDecision[] };
  assert.equal(concise.entries.length, 190);
  assert.equal(new Set(concise.entries.map((entry) => entry.key)).size, 190);
  for (const entry of concise.entries) {
    const before = original.entries.find((row) => row.key === entry.key)!;
    assert.deepEqual(entry.expected, {
      ...before.expected,
      ...before.decision,
      version: before.expected.version + 1,
    });
    assert.equal(entry.decision.status, before.decision.status);
    assert.equal(entry.decision.target, before.decision.target);
    assert.ok(entry.decision.notes.startsWith(before.expected.notes.trim()));
    assert.ok(entry.decision.rule.length < before.decision.rule.length, entry.key);
  }
  await db.transaction(async (trx) => {
    const [actor] = await trx("auth_user")
      .insert({ email: "onagre-shared-check@localhost.local", active: true })
      .returning("id");
    const entry = {
      ...concise.entries.find((row) => row.key === "field:decisions.datenotificationdecision")!,
      key: "test:concise-draft",
    };
    await trx("onagre_mapping").insert({
      key: entry.key,
      section: "decisions",
      label: "test",
      confidence: "",
      ...entry.expected,
    });
    assert.equal((await applyReviewedDecisions(trx, [entry])).prepared, 1);
    assert.equal(
      (await trx("onagre_mapping").where({ key: entry.key }).first()).version,
      entry.expected.version,
    );
    assert.equal((await applyReviewedDecisions(trx, [entry], actor.id)).prepared, 1);
    assert.equal((await trx("onagre_mapping").where({ key: entry.key }).first()).notes, "");
    assert.equal((await applyReviewedDecisions(trx, [entry], actor.id)).unchanged, 1);
    assert.equal(
      (await trx("onagre_mapping_revision").where({ mapping_key: entry.key })).length,
      1,
    );
    // A human edit, even to an otherwise matching draft, must not be overwritten.
    await trx("onagre_mapping")
      .where({ key: entry.key })
      .update({
        ...entry.expected,
        notes: "Décision de réunion",
        version: entry.expected.version + 2,
      });
    assert.deepEqual((await applyReviewedDecisions(trx, [entry], actor.id)).skipped, [entry.key]);
    assert.equal(
      (await trx("onagre_mapping").where({ key: entry.key }).first()).notes,
      "Décision de réunion",
    );
    await trx("onagre_mapping")
      .where({ key: entry.key })
      .update({ ...entry.expected, status: "validated" });
    assert.deepEqual((await applyReviewedDecisions(trx, [entry], actor.id)).skipped, [entry.key]);
    const key = "test-shared-rule";
    await trx("onagre_shared_rule").insert({
      key,
      title: "Test",
      rule: "Brouillon",
      status: "review",
    });
    const form = new FormData();
    for (const [name, value] of Object.entries({
      key,
      version: "1",
      status: "validated",
      rule: "Conserver le texte source.",
      notes: "",
    }))
      form.set(name, value);
    const decision = parseSharedRule(form);
    await saveSharedRule(trx, actor.id, decision);
    const after = await trx("onagre_shared_rule").where({ key }).first();
    assert.equal(after.version, 2);
    assert.equal(after.status, "validated");
    const revisions = await trx("onagre_shared_rule_revision").where({ rule_key: key });
    assert.equal(revisions.length, 1);
    assert.equal(revisions[0].before.rule, "Brouillon");
    assert.equal(revisions[0].after.rule, decision.rule);
    await assert.rejects(saveSharedRule(trx, actor.id, decision), /a changé/u);
    verifyInvalidRule(form);
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    "Passed concise draft coverage, shorter rules, preserved notes/targets/statuses, dry run, replay, human edits, shared rule validation/conflicts and audit. Fixtures rolled back.",
  );
} finally {
  await db.destroy();
}
