import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Knex } from "../../libs/database/node_modules/knex/types/index.d.ts";
import type { OnagreBundle } from "@pitchou/types/onagre.ts";
import { originalMappings, originalWorkbook } from "@pitchou/common/onagre/originalWorkbook.ts";
import { readOnagreWorkbook } from "@pitchou/common/onagre/workbook.ts";
import { parseBundle } from "@pitchou/server/onagre/validation.ts";
import { stageSnapshot } from "@pitchou/server/onagre/snapshots.ts";
import { loadMappings } from "@pitchou/server/onagre/workbook.ts";
import { createFixture } from "./transfer/fixtures.ts";

// The optional original is needed only for this one-time audit, never for dump preparation.
if (process.argv[2]) {
  const bytes = await readFile(process.argv[2]);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), originalWorkbook.fingerprint);
  assert.deepEqual(readOnagreWorkbook(bytes), originalMappings);
  const require = createRequire(new URL("../../libs/common/package.json", import.meta.url));
  const XLSX =
    require("xlsx") as typeof import("../../libs/common/node_modules/xlsx/types/index.d.ts");
  const workbook = XLSX.read(bytes);
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils
      .sheet_to_json<(string | number | boolean)[]>(workbook.Sheets[name], {
        header: 1,
        defval: "",
      })
      .map((cells, index) => ({ number: index + 1, cells }))
      .filter((row) => row.cells.some((cell) => cell !== "")),
  }));
  assert.deepEqual(sheets, originalWorkbook.sheets);
  for (const sheet of Object.values(workbook.Sheets))
    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith("!")) continue;
      assert.ok(!cell.c?.length, "Unexpected embedded cell comment");
      assert.ok(!cell.f, "Unexpected formula");
    }
  console.log(
    "PASS original XLSX fingerprint, every nonempty cell on every sheet, and all 193 mapping seeds match retained source.",
  );
}

const fixture = await createFixture();
const knex = createRequire(new URL("../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;
const db = knex({ client: "pg", connection: fixture.targetUrl });
try {
  const bundle: OnagreBundle = {
    format: "pitchou-onagre-v1",
    fingerprint: "c".repeat(64),
    filename: "first.dump",
    workbookFingerprint: originalWorkbook.fingerprint,
    mappings: structuredClone(originalMappings),
    tables: [...new Set(originalMappings.map((row) => row.section))].map((name) => ({
      name,
      columns: originalMappings
        .filter((row) => row.section === name && row.key.startsWith("field:"))
        .map((row) => row.label),
      count: ["projet", "demandes"].includes(name) ? 1 : 0,
      samples: [],
    })),
    demandes: [{ demandesid: "1", projetid: "2", codedemande: "code" }],
    projets: [{ projetid: "2", nomprojet: "Synthetic" }],
  };
  const first = await db.transaction((trx) => stageSnapshot(trx, parseBundle(bundle)));
  const key = "field:projet.projetid";
  await db("onagre_mapping").where({ key }).update({
    status: "discuss",
    target: "identity",
    rule: "Team decision",
    notes: "Edited team notes",
    version: 7,
  });
  const before = await db("onagre_mapping").orderBy("key");
  const displayed = (await loadMappings(db)).find((row) => row.key === key)!;
  assert.equal(displayed.notes, "Edited team notes");
  assert.equal(displayed.originalWorkbook?.confidence, "fort");
  assert.equal(
    displayed.originalWorkbook?.comment,
    "vérifier si dans onagre les utilisateurs ont plutôt l'habitude de projetid ou de demandesid",
  );
  const duplicate = await db.transaction((trx) => stageSnapshot(trx, parseBundle(bundle)));
  assert.deepEqual(duplicate, { ...first, duplicate: true });
  const later = structuredClone(bundle);
  later.fingerprint = "d".repeat(64);
  later.filename = "updated.dump";
  later.projets[0].nomprojet = "Updated source";
  later.tables.find((table) => table.name === "projet")!.columns.push("newfield");
  later.mappings.push({
    key: "field:projet.newfield",
    section: "projet",
    label: "newfield",
    context: "",
    proposal: "",
    confidence: "",
    notes: "",
  });
  const next = await db.transaction((trx) => stageSnapshot(trx, parseBundle(later)));
  assert.equal(next.duplicate, false);
  assert.deepEqual(
    await db("onagre_mapping").whereNot({ key: "field:projet.newfield" }).orderBy("key"),
    before,
  );
  assert.equal(
    (await db("onagre_mapping").where({ key: "field:projet.newfield" }).first()).status,
    "todo",
  );
  assert.equal(
    (await db("onagre_source_demande").where({ snapshot_id: next.id }).first()).name,
    "Updated source",
  );
  await assert.rejects(
    db.transaction((trx) => stageSnapshot(trx, { ...later, workbookFingerprint: "e".repeat(64) })),
    /classeur d'origine/u,
  );
  assert.equal(Number((await db("onagre_mapping").count("* as n"))[0].n), 194);
  console.log(
    "PASS workbook-free seeds, duplicate snapshot no-op, later dump preserves all decisions/comments/confidence/versions, new field seeded, mismatched lineage rejected.",
  );
} finally {
  await db.destroy();
  await fixture.cleanup();
}
