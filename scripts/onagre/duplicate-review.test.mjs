import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { connect } from "./local-import/connection.mjs";
import {
  parseDuplicateDecision,
  saveDuplicateDecision,
} from "../../libs/server/src/onagre/duplicates.ts";
import {
  parseDuplicateBundle,
  stageDuplicateBundle,
} from "../../libs/server/src/onagre/duplicates/bundle.ts";

function fixture() {
  const facts = {
    reference: "TEST-1",
    deposit: null,
    signatures: [],
    departments: [],
    communes: [],
  };
  const payload = {
    projectId: "999999991",
    name: "Synthetic overlap test",
    sourceHash: "a".repeat(64),
    reason: "Two periods need review",
    question: "Same period or a new demande?",
    omittedDemandeIds: [],
    candidates: [],
    demandes: [
      {
        ...facts,
        key: "onagre-national:demandes:999999991",
        id: "999999991",
        linkedDossierId: null,
        linkReason: "",
        question: "Covered?",
      },
      {
        ...facts,
        key: "onagre-national:demandes:999999992",
        id: "999999992",
        linkedDossierId: 1,
        linkReason: "Confirmed",
        question: "No decision needed",
      },
    ],
  };
  return {
    format: "pitchou-onagre-duplicate-review-v1",
    projects: [
      {
        project_id: payload.projectId,
        review_hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
        payload,
      },
    ],
  };
}
const form = (values) => {
  const result = new FormData();
  for (const [key, value] of Object.entries(values)) result.set(key, String(value));
  return result;
};
function input(project) {
  return {
    project_id: project.project_id,
    review_hash: project.review_hash,
    demande_key: project.payload.demandes[0].key,
    version: 0,
    outcome: "ignore",
    reason: "Covered by the existing DN record.",
  };
}

test("decisions require an explicit known outcome, valid version and justification", () => {
  const valid = input(fixture().projects[0]);
  assert.deepEqual(parseDuplicateDecision(form(valid)), valid);
  for (const patch of [
    { outcome: "unknown" },
    { reason: " " },
    { version: "" },
    { version: -1 },
    { version: 1.5 },
    { review_hash: "old" },
    { demande_key: "wrong" },
  ])
    assert.throws(() => parseDuplicateDecision(form({ ...valid, ...patch })), /Décision invalide/u);
  assert.equal(
    parseDuplicateDecision(form({ ...valid, outcome: "pending", reason: "" })).outcome,
    "pending",
  );
});

test("bundles reject altered evidence and duplicate demande identities", () => {
  const bundle = fixture();
  assert.equal(parseDuplicateBundle(bundle).length, 1);
  const altered = structuredClone(bundle);
  altered.projects[0].payload.reason = "Changed";
  assert.throws(() => parseDuplicateBundle(altered), /Invalid/u);
  const duplicate = structuredClone(bundle);
  duplicate.projects.push(duplicate.projects[0]);
  assert.throws(() => parseDuplicateBundle(duplicate), /Invalid/u);
});

test("local transactional review preserves links, history and business records", async () => {
  const client = await connect(process.env);
  try {
    await client.begin();
    const trx = client.trx;
    // The owner's separate importer can write concurrently; compare our own stable snapshot.
    await trx.raw("set transaction isolation level repeatable read");
    const business = async () =>
      (
        await trx.raw(
          "select count(*)::int as count, md5(string_agg(row_to_json(d)::text, '' order by id)) as hash from dossier d",
        )
      ).rows[0];
    const before = await business();
    const actor = await trx("auth_user").select("id").first();
    assert(actor);
    const bundle = fixture(),
      project = bundle.projects[0];
    assert.deepEqual(await stageDuplicateBundle(trx, bundle), {
      projects: 1,
      inserted: 1,
      unchanged: 0,
    });
    assert.equal((await stageDuplicateBundle(trx, bundle)).unchanged, 1);
    const initial = input(project);
    const first = await saveDuplicateDecision(trx, actor.id, initial);
    assert.equal(first.version, 1);
    assert.equal(first.actor_id, actor.id);
    await assert.rejects(saveDuplicateDecision(trx, actor.id, initial), /autre décision/u);
    await assert.rejects(
      saveDuplicateDecision(trx, actor.id, { ...initial, review_hash: "b".repeat(64) }),
      /revue a changé/u,
    );
    for (const demande_key of [
      project.payload.demandes[1].key,
      "onagre-national:demandes:999999993",
    ])
      await assert.rejects(
        saveDuplicateDecision(trx, actor.id, { ...initial, demande_key }),
        /lien confirmé/u,
      );
    await saveDuplicateDecision(trx, actor.id, {
      ...initial,
      version: 1,
      outcome: "import_new",
      reason: "Separate campaign confirmed.",
    });
    await saveDuplicateDecision(trx, actor.id, {
      ...initial,
      version: 2,
      outcome: "pending",
      reason: "Needs a further check.",
    });
    const history = await trx("onagre_duplicate_revision")
      .where({ demande_key: initial.demande_key })
      .orderBy("id");
    assert.deepEqual(
      history.map((r) => r.after.outcome),
      ["ignore", "import_new", "pending"],
    );
    assert.equal(history[0].before, null);
    assert.equal(history[2].before.reason, "Separate campaign confirmed.");
    const changed = fixture();
    changed.projects[0].payload.reason = "New evidence";
    changed.projects[0].review_hash = createHash("sha256")
      .update(JSON.stringify(changed.projects[0].payload))
      .digest("hex");
    await assert.rejects(stageDuplicateBundle(trx, changed), /different evidence/u);
    assert.deepEqual(await business(), before);
    await client.finish(false);
    await client.begin();
    assert.equal(
      await client
        .trx("onagre_duplicate_project")
        .where({ project_id: project.project_id })
        .first(),
      undefined,
    );
    await client.finish(false);
  } finally {
    await client.end();
  }
});
