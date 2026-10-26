import assert from "node:assert/strict";
import { originalMappings, originalWorkbook } from "@pitchou/common/onagre/originalWorkbook.ts";
import { motifDerogationOptions } from "@pitchou/common/dossierFormOptions.ts";
import { fieldRules } from "@pitchou/server/onagre/import/decisions.ts";
import { createImportPreview, applyImportPreview } from "@pitchou/server/onagre/import.ts";
import { type Database, snapshot, counts, enable } from "./fixtures.ts";
import { verifyMappingChanges } from "./mappingChanges.ts";

export async function seedImplementedMappings(db: Database) {
  const rules: Record<string, { target: string; rule: string; activity_code?: string }> = {
    "reference:objet:2": {
      target: "dossier.main_activite",
      activity_code: "transport-routier",
      rule: "Choisir l'activité Pitchou « transport-routier » pour cet objet Onagre.",
    },
    "reference:motifderogation:5": {
      target: "dossier.motif_derogation",
      rule: `Pour motifderogationid = 15, choisir le motif Pitchou « ${motifDerogationOptions[3]} ».`,
    },
  };
  for (const [key, rule] of Object.entries(fieldRules))
    rules[key] = {
      rule,
      target: key.endsWith("solutionsalternatives")
        ? "dossier.no_other_satisfactory_solution_justification"
        : key.endsWith("motifderogationid")
          ? "dossier.motif_derogation"
          : "dossier.description",
    };
  for (const [key, choice] of Object.entries(rules)) {
    const seed = originalMappings.find((row) => row.key === key)!;
    assert(seed);
    await db("onagre_mapping")
      .insert({ ...seed, ...choice, status: "validated", version: 4 })
      .onConflict("key")
      .merge();
  }
}

export async function seedReferences(db: Database, snapshotId: number) {
  const rows = [];
  for (const [table, number, idColumn, labelColumn] of [
    ["objet", 2, "objetid", "libobjet"],
    ["motifderogation", 5, "motifderogationid", "libmotifderogation"],
  ] as const) {
    const source = originalWorkbook.sheets
      .find((sheet) => sheet.name.toLowerCase() === table)!
      .rows.find((row) => row.number === number)!;
    rows.push({
      snapshot_id: snapshotId,
      table_name: table,
      row_number: 1,
      content: { [idColumn]: String(source.cells[0]), [labelColumn]: String(source.cells[2]) },
    });
  }
  rows.push({
    snapshot_id: snapshotId,
    table_name: "services",
    row_number: 1,
    content: { servicesid: "99", nomservice: "Service historique" },
  });
  await db("onagre_source_row").insert(rows);
}

const demande = {
  projetid: "50001",
  motifderogationid: "15",
  lieux: "Ligne 1\n  Ligne 2 <b>brute</b>",
  periodes: "Printemps et automne, à confirmer",
  solutionsalternatives: "  Texte intégral\nconservé  ",
};
const projet = {
  projetid: "50001",
  objetid: "1",
  servicecoordinateurid: "99",
  nomprojet: "Projet commun",
};

export async function verifyMappings(db: Database) {
  enable();
  await seedImplementedMappings(db);
  const [actor] = await db("auth_user")
    .insert({ email: "mappings@example.invalid" })
    .returning("id");
  const snapshotId = await snapshot(db, [
    { id: 50001, demande, projet },
    { id: 50002, demande, projet },
    { id: 50003, demande: { ...demande, datereception: null }, projet },
    { id: 50004, demande, projet: { ...projet, objetid: "4" } },
    { id: 50005, demande, projet },
    { id: 50006, demande, projet },
  ]);
  await seedReferences(db, snapshotId);
  await db("dossier").insert({
    name: "Dossier préexistant",
    depot_date: "2000-01-01",
    onagre_demande_identifier: "TEST-50005",
  });
  const preview = (ids = ["50001", "50002", "50003", "50004", "50005"]) =>
    createImportPreview(db, { snapshotId, recordIds: ids }, actor.id);
  const apply = (previewId: string, ids: string[]) =>
    db.transaction((trx) => applyImportPreview(trx, actor.id, { previewId, recordIds: ids }));
  const before = await counts(db);
  const planned = await preview();
  assert.deepEqual(await counts(db), before);
  assert.deepEqual(
    planned.records.map((r) => r.status),
    ["ready", "ready", "blocked", "ready", "conflict"],
  );
  const fields = planned.records[0].plan!.columns;
  assert.equal(
    fields.main_activite,
    (await db("activite").where({ code: "transport-routier" }).first()).label,
  );
  assert.equal(fields.motif_derogation, motifDerogationOptions[3]);
  assert.equal(
    fields.description,
    `Lieux des opérations, Onagre\n${demande.lieux}\n\nPériodes souhaitées, Onagre\n${demande.periodes}\n\nService coordinateur du projet, Onagre\nService historique`,
  );
  assert.equal(fields.no_other_satisfactory_solution_justification, demande.solutionsalternatives);
  assert.equal(planned.records[3].plan!.columns.main_activite, undefined);
  assert(planned.records[3].omissions.some((s) => s.includes("objet #4")));
  const run = await apply(planned.previewId, ["50001", "50002"]);
  const after = await counts(db);
  assert.equal(
    after.dossier,
    before.dossier + 2,
    "two demandes sharing a project create two distinct dossiers",
  );
  for (const table of Object.keys(before).filter(
    (key) => !["dossier", "onagre_import_identity", "onagre_import_run"].includes(key),
  ))
    assert.equal(
      after[table],
      before[table],
      `no phase, relation or notification writes: ${table}`,
    );
  await verifyWrittenFields(db, run, planned);
  const replay = await preview(["50001", "50002"]);
  assert(replay.records.every((r) => r.status === "already_imported"));
  await apply(replay.previewId, ["50001", "50002"]);
  assert.equal((await counts(db)).dossier, after.dossier);
  await verifyMappingChanges(db, actor.id, snapshotId);
  console.log(
    "PASS: mapped values, raw multiline text, stable reference IDs, shared project, missing date, legacy match, provenance, no notifications and unchanged rerun.",
  );
}

async function verifyWrittenFields(
  db: Database,
  run: Awaited<ReturnType<typeof applyImportPreview>>,
  planned: Awaited<ReturnType<typeof createImportPreview>>,
) {
  const fields = planned.records[0].plan!.columns;
  for (const outcome of run.outcomes.filter((r) => r.status === "created")) {
    const dossier = await db("dossier").where({ id: outcome.dossierId }).first();
    for (const [key, value] of Object.entries(fields)) assert.equal(dossier[key], value);
    assert.equal(dossier.depot_date.toISOString(), "1998-02-03T00:00:00.000Z");
    const identity = await db("onagre_import_identity").where({ dossier_id: dossier.id }).first();
    assert.deepEqual(identity.raw_source.plan, planned.records[0].plan);
    assert.equal(identity.raw_source.references.services[0].nomservice, "Service historique");
  }
}
