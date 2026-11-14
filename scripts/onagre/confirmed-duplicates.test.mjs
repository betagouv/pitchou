import assert from "node:assert/strict";
import { test } from "node:test";
import { connect } from "./local-import/connection.mjs";
import {
  parseConfirmedDuplicates,
  stageConfirmedDuplicates,
} from "../../libs/server/src/onagre/confirmedDuplicates.ts";

function fixture() {
  const facts = {
    reference: "SYNTHETIC-REFERENCE",
    deposit: null,
    signatures: [],
    departments: ["01"],
    communes: [],
  };
  return {
    format: "pitchou-onagre-confirmed-duplicates-v1",
    links: [
      {
        demandeKey: "onagre-national:demandes:999999997",
        projectId: "999999997",
        projectName: "Synthetic confirmed overlap",
        sourceHash: "a".repeat(64),
        confirmedAt: "2026-11-10T08:00:00.000Z",
        profile: "complete_reference",
        reason: "Exact reference and same operation; differing dates preserved.",
        source: { ...facts, id: "999999997" },
        target: { ...facts, id: 1, name: "Synthetic DN" },
        otherDemandesToReview: 1,
        relatedExisting: [{ dossierId: 2, reason: "Related entry preserved" }],
      },
    ],
  };
}

test("confirmed evidence requires an explicit recognised basis and its own reason", () => {
  const bundle = fixture();
  assert.equal(parseConfirmedDuplicates(bundle)[0].payload.reason, bundle.links[0].reason);
  for (const patch of [
    { profile: "automatic_title_match" },
    { reason: "" },
    { sourceHash: "" },
    { confirmedAt: "unknown" },
    { otherDemandesToReview: -1 },
  ])
    assert.throws(
      () => parseConfirmedDuplicates({ ...bundle, links: [{ ...bundle.links[0], ...patch }] }),
      /Invalid confirmed/u,
    );
  assert.throws(
    () => parseConfirmedDuplicates({ ...bundle, links: [bundle.links[0], bundle.links[0]] }),
    /Invalid confirmed/u,
  );
});

test("local loading is idempotent and cannot rewrite confirmed evidence or team choices", async () => {
  const client = await connect(process.env);
  try {
    await client.begin();
    const trx = client.trx;
    await trx.raw("set transaction isolation level repeatable read");
    const before = await trx("onagre_duplicate_decision").select("*").orderBy("demande_key");
    const bundle = fixture();
    assert.deepEqual(await stageConfirmedDuplicates(trx, bundle), {
      links: 1,
      inserted: 1,
      unchanged: 0,
    });
    assert.deepEqual(await stageConfirmedDuplicates(trx, bundle), {
      links: 1,
      inserted: 0,
      unchanged: 1,
    });
    const altered = structuredClone(bundle);
    altered.links[0].target.id = 3;
    await assert.rejects(stageConfirmedDuplicates(trx, altered), /changed evidence/u);
    const row = await trx("onagre_confirmed_duplicate")
      .where({ demande_key: bundle.links[0].demandeKey })
      .first();
    assert.equal(row.payload.target.id, 1);
    assert.equal(row.payload.otherDemandesToReview, 1);
    assert.deepEqual(
      await trx("onagre_duplicate_decision").select("*").orderBy("demande_key"),
      before,
    );
    await client.finish(false);
  } finally {
    await client.end();
  }
});
