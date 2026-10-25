import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Knex } from "../../libs/database/node_modules/knex/types/index.d.ts";
import { createFixture } from "./transfer/fixtures.ts";
import {
  loadServiceMappings,
  parseServiceDecision,
  saveServiceMapping,
  replaceGroupCatalog,
} from "../../libs/server/src/onagre/services.ts";
import { MappingConflict } from "../../libs/server/src/onagre/mappings.ts";

// The fixture creates and drops fresh databases on loopback only.
const fixture = await createFixture();
const knex = createRequire(new URL("../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;
const db = knex({ client: "pg", connection: fixture.sourceUrl });
const groupId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const source = {
  servicesid: "101",
  nomservice: "Service régional",
  regionsid: "1",
  datefinservice: null,
  view: "true",
};
try {
  await db("onagre_source_row").insert([
    { snapshot_id: 17, table_name: "services", row_number: 1, content: JSON.stringify(source) },
    {
      snapshot_id: 17,
      table_name: "regions",
      row_number: 1,
      content: JSON.stringify({ regionsid: "1", liblongregion: "Région test" }),
    },
  ]);
  let workspace = await loadServiceMappings(db, 17);
  const service = workspace.services.find((row) => row.id === 101)!;
  assert.equal(service.region, "Région test");
  assert.equal(service.mapping, null);
  const form = new FormData();
  for (const [key, value] of Object.entries({
    snapshotId: 17,
    serviceId: 101,
    version: 0,
    sourceHash: service.sourceHash,
    catalogHash: workspace.catalogHash,
    status: "validated",
    notes: "Choix de test",
  }))
    form.set(key, String(value));
  assert.throws(() => parseServiceDecision(form), /au moins un groupe/u);
  form.append("groupIds", groupId);
  const decision = parseServiceDecision(form);
  const results = await Promise.allSettled(
    [1, 2].map(() => db.transaction((trx) => saveServiceMapping(trx, 3, decision))),
  );
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const failure = results.find((result) => result.status === "rejected");
  assert.ok(failure?.status === "rejected" && failure.reason instanceof MappingConflict);
  assert.equal(
    Number(
      (await db("onagre_service_mapping_revision").where({ service_id: 101 }).count("* as n"))[0].n,
    ),
    1,
  );
  assert.deepEqual(
    (await db("onagre_service_mapping").where({ service_id: 101 }).first()).group_ids,
    [groupId],
  );
  await assert.rejects(
    db.transaction((trx) =>
      saveServiceMapping(trx, 3, {
        ...decision,
        version: 1,
        groupIds: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"],
      }),
    ),
    /absent ou inactif/u,
  );
  await assert.rejects(
    db.transaction((trx) =>
      saveServiceMapping(trx, 3, { ...decision, version: 1, sourceHash: "stale" }),
    ),
    MappingConflict,
  );
  await assert.rejects(
    db.transaction((trx) => saveServiceMapping(trx, 999999, { ...decision, version: 1 })),
    /foreign key constraint/u,
  );
  assert.equal((await db("onagre_service_mapping").where({ service_id: 101 }).first()).version, 1);
  await db("onagre_snapshot").insert({
    id: 18,
    fingerprint: "f".repeat(64),
    filename: "new.dump",
    workbook_fingerprint: "b".repeat(64),
    tables: "[]",
    workbook_mappings: "[]",
    records_complete: true,
  });
  await db("onagre_source_row").insert({
    snapshot_id: 18,
    table_name: "services",
    row_number: 1,
    content: JSON.stringify({ ...source, nomservice: "Service renommé" }),
  });
  workspace = await loadServiceMappings(db, 18);
  assert.ok(workspace.services.find((row) => row.id === 101)?.needsReview);
  assert.ok(workspace.services.find((row) => row.id === 42)?.absent);
  assert.deepEqual(workspace.services.find((row) => row.id === 101)?.mapping?.group_ids, [groupId]);
  await db.transaction((trx) =>
    replaceGroupCatalog(trx, {
      source: "Refreshed",
      refreshedAt: new Date().toISOString(),
      groups: [
        {
          id: groupId,
          name: "Fixture group",
          active: false,
          coverage_needs_review: false,
          departments: ["01"],
        },
      ],
    }),
  );
  await assert.rejects(
    db.transaction((trx) => saveServiceMapping(trx, 3, { ...decision, version: 1 })),
    /liste des groupes/u,
  );
  workspace = await loadServiceMappings(db, 17);
  assert.ok(workspace.services.find((row) => row.id === 101)?.needsReview);
  await assert.rejects(
    db.transaction((trx) =>
      saveServiceMapping(trx, 3, { ...decision, version: 1, catalogHash: workspace.catalogHash }),
    ),
    /inactif/u,
  );
  form.set("status", "excluded");
  assert.throws(() => parseServiceDecision(form), /ne doit pas contenir/u);
  form.delete("groupIds");
  form.set("notes", "");
  assert.throws(() => parseServiceDecision(form), /raison/u);
  assert.equal(Number((await db("dossier").count("* as n"))[0].n), 1);
  assert.equal(Number((await db("user_groupe").count("* as n"))[0].n), 0);
  console.log(
    "PASS service decisions: persistence, concurrent edit rejection, atomic audit rollback, stale source/catalogue, inactive targets, retained decisions across dumps, exclusion validation, no dossier or membership changes.",
  );
} finally {
  await db.destroy();
  await fixture.cleanup();
}
