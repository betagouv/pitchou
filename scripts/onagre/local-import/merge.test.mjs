import test from "node:test";
import assert from "node:assert/strict";
import { mergeFields } from "./merge.mjs";
import { assertLocalTarget } from "./connection.mjs";
import { validateSample } from "./validation.mjs";
const env = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://dev:unused@localhost:5434/especes_pro_3731",
};
test("only the declared local database is accepted", () => {
  assertLocalTarget(env);
  for (const patch of [
    { NODE_ENV: "production" },
    { PUBLIC_PITCHOU_ENV: "staging" },
    { DATABASE_URL: env.DATABASE_URL.replace("localhost", "database.example.org") },
    { DATABASE_URL: env.DATABASE_URL.replace("5434", "5432") },
    { DATABASE_URL: env.DATABASE_URL + "?host=remote.example.org" },
  ])
    assert.throws(() => assertLocalTarget({ ...env, ...patch }));
});
test("unchanged imports preserve instructor edits", () => {
  assert.deepEqual(
    mergeFields({ name: "Original" }, { name: "Local correction" }, { name: "Original" }),
    { updates: {}, conflicts: [], preserved: ["name"] },
  );
});
test("source changes update untouched fields and explicit null clears them", () => {
  assert.deepEqual(
    mergeFields(
      { name: "Original", description: "Text" },
      { name: "Original", description: "Text" },
      { name: "Correction", description: null },
    ),
    { updates: { name: "Correction", description: null }, conflicts: [], preserved: [] },
  );
});
test("concurrent source and instructor edits conflict", () => {
  assert.deepEqual(
    mergeFields({ name: "Original" }, { name: "Local correction" }, { name: "Source correction" })
      .conflicts,
    ["name"],
  );
});
test("matching edits converge and new nonempty fields are protected", () => {
  assert.deepEqual(mergeFields({ name: "Old" }, { name: "New" }, { name: "New" }).conflicts, []);
  assert.deepEqual(
    mergeFields({}, { description: "Manual" }, { description: "Import" }).conflicts,
    ["description"],
  );
});
test("missing managed fields are rejected, never silently deleted", () => {
  assert.throws(
    () => mergeFields({ description: "Text" }, { description: "Text" }, {}),
    /explicit null/u,
  );
});
test("calendar date values compare without timestamp formatting changes", () => {
  assert.deepEqual(
    mergeFields(
      { signature_date: "2020-02-01" },
      { signature_date: new Date("2020-02-01T00:00:00Z") },
      { signature_date: "2020-02-02" },
    ).updates,
    { signature_date: "2020-02-02" },
  );
});
test("input cannot choose arbitrary tables, identifiers or parents", () => {
  const sample = {
    formatVersion: 1,
    identity: {
      sourceInstance: "onagre-national",
      sourceTable: "demandes",
      sourceId: "1",
      key: "onagre-national:demandes:1",
    },
    proposal: { dossier: { source: "onagre", depot_date: null }, records: [] },
  };
  validateSample(sample);
  for (const record of [
    { table: "auth_user", sourceKey: "onagre-national:x", values: {} },
    { table: "commentaire", sourceKey: "onagre-national:x", values: { id: "arbitrary" } },
    {
      table: "prescription",
      sourceKey: "onagre-national:x",
      values: { description: "x" },
      parentSourceKey: "missing",
    },
  ])
    assert.throws(() =>
      validateSample({ ...sample, proposal: { ...sample.proposal, records: [record] } }),
    );
  assert.throws(
    () =>
      validateSample({
        ...sample,
        proposal: {
          ...sample.proposal,
          dossier: { ...sample.proposal.dossier, ddep_depot_date: "2026-02-30" },
        },
      }),
    /Invalid date/u,
  );
});
