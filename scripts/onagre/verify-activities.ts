import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { Knex } from "../../libs/database/node_modules/knex/types/index.d.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { createFixture } from "./transfer/fixtures.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import {
  linkWorksheetRows,
  suggestedActivity,
  worksheetKey,
} from "@pitchou/common/onagre/activities.ts";

const fixture = await createFixture();
const knex = createRequire(new URL("../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;
const db = knex({ client: "pg", connection: fixture.sourceUrl });
try {
  await db.schema.createTable("activite", (table) => {
    table.text("code").primary();
    table.text("label");
    table.text("groupe_code");
  });
  const activities = [
    { code: "energie-eolien", label: "Éolien", groupe_code: "energie" },
    { code: "energie-photovoltaique", label: "Photovoltaïque", groupe_code: "energie" },
  ];
  await db("activite").insert(activities);
  const base = {
    section: "objet",
    label: "4 · Production énergie renouvelable",
    context: "",
    proposal: "Production énergie renouvelable – Eolien",
    confidence: "",
    notes: "",
    target: "dossier.main_activite",
    rule: "Choisir l'activité Pitchou « energie-eolien » pour cet objet Onagre.",
    status: "discuss",
    version: 1,
  };
  await db("onagre_mapping").insert(
    [1, 2].map((id) => ({ ...base, key: `reference:objet:${id}` })),
  );
  const mappings = await db<OnagreMapping>("onagre_mapping").where({ section: "objet" });
  const linked = linkWorksheetRows(
    [
      { row_number: 1, cells: ["header"] },
      {
        row_number: 35,
        cells: [
          "Éolien",
          "Production énergie renouvelable (éolien)",
          "Production énergie renouvelable – Eolien",
          "",
        ],
      },
      { row_number: 56, cells: ["Police", "à supprimer", "", ""] },
    ],
    mappings,
  );
  assert.equal(linked.length, 2);
  assert.deepEqual(linked[0].mappingKeys.sort(), ["reference:objet:1", "reference:objet:2"]);
  assert.deepEqual(linked[1].mappingKeys, [worksheetKey(56)]);
  assert.equal(linked[1].tracking, "Police");
  assert.equal(suggestedActivity(mappings[0], activities), "energie-eolien");
  const form = new FormData();
  for (const [key, value] of Object.entries({
    key: "reference:objet:1",
    version: 1,
    status: "validated",
    target: "dossier.main_activite",
    rule: "Choisir le photovoltaïque si confirmé dans le dossier.",
    notes: "Décision partagée",
    activity_code: "energie-photovoltaique",
  }))
    form.set(key, String(value));
  const decision = parseDecision(form);
  await db.transaction((trx) => saveMapping(trx, 3, decision));
  let shared = await db<OnagreMapping>("onagre_mapping").where({ key: decision.key }).first();
  assert.equal(shared?.activity_code, "energie-photovoltaique");
  assert.equal(shared?.version, 2);
  assert.equal(shared?.notes, "Décision partagée");
  await assert.rejects(
    db.transaction((trx) => saveMapping(trx, 3, decision)),
    MappingConflict,
  );
  await assert.rejects(
    db.transaction((trx) =>
      saveMapping(trx, 3, { ...decision, version: 2, activity_code: "missing" }),
    ),
    /n'existe plus/u,
  );
  await assert.rejects(
    db.transaction((trx) => saveMapping(trx, 3, { ...decision, version: 2, activity_code: "" })),
    /Choisissez une activité/u,
  );
  await assert.rejects(
    db.transaction((trx) => saveMapping(trx, 3, { ...decision, version: 2, status: "excluded" })),
    /Retirez/u,
  );
  await assert.rejects(
    db.transaction((trx) => saveMapping(trx, 99999, { ...decision, version: 2 })),
    /foreign key constraint/u,
  );
  assert.equal((await db("onagre_mapping").where({ key: decision.key }).first()).version, 2);
  form.set("version", "2");
  form.set("activity_code", "");
  form.set("status", "discuss");
  await db.transaction((trx) => saveMapping(trx, 9, parseDecision(form)));
  shared = await db<OnagreMapping>("onagre_mapping").where({ key: decision.key }).first();
  assert.equal(shared?.activity_code, "");
  assert.equal(shared?.version, 3);
  assert.equal(suggestedActivity({ ...shared!, rule: base.rule }, activities), "");
  const revisions = await db("onagre_mapping_revision")
    .where({ mapping_key: decision.key })
    .orderBy("id");
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].after.activity_code, "energie-photovoltaique");
  assert.equal(revisions[1].before.activity_code, "energie-photovoltaique");
  assert.equal(Number((await db("dossier").count("* as n"))[0].n), 1);
  console.log(
    "PASS activity worksheet linking, distinct competing proposals, unlinked rows, shared decisions and revisions, stale edits, removed activities, validation, explicit clearing, rollback, no dossier changes.",
  );
} finally {
  await db.destroy();
  await fixture.cleanup();
}
