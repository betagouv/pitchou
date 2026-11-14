import assert from "node:assert/strict";
import { createImportPreview, applyImportPreview } from "@pitchou/server/onagre/import.ts";
import { snapshot, counts, enable, type Database } from "./fixtures.ts";

export async function verifyReconciliation(db: Database) {
  enable();
  const [actor] = await db("auth_user")
    .insert({ email: "reconciliation@example.invalid" })
    .returning("id");
  const id = await snapshot(db, [
    {
      id: 8001,
      demande: { codedemande: "2024-00510-011-001" },
      projet: { codeprojet: "2024-03-13f-00510" },
    },
    {
      id: 8002,
      demande: { codedemande: "2024-00511-011-001", departementsid: "64" },
      projet: { nomprojet: "Restauration du seuil de Meillon" },
    },
    { id: 8003, demande: { codedemande: "2024-00512-011-001" } },
    {
      id: 8004,
      demande: { projetid: "8001", codedemande: "2024-00510-011-002" },
      projet: { projetid: "8001", codeprojet: "2024-03-13f-00510" },
    },
  ]);
  await db("onagre_source_row").insert({
    snapshot_id: id,
    table_name: "departements",
    row_number: 1,
    content: { departementsid: "64", codedept: "64" },
  });
  await db("dossier").insert([
    { onagre_demande_identifier: "Projet : 2024-03-13F-00510" },
    { name: "Travaux de restauration du seuil à Meillon", departments: JSON.stringify(["64"]) },
  ]);
  const request = { snapshotId: id, recordIds: ["8001", "8002", "8003"] };
  const before = await counts(db);
  const sibling = await createImportPreview(db, { snapshotId: id, recordIds: ["8004"] }, actor.id);
  assert.equal(
    sibling.records[0].status,
    "conflict",
    "a partial selection cannot bypass a project overlap",
  );
  const preview = await createImportPreview(db, request, actor.id);
  assert.deepEqual(
    preview.records.map((r) => r.status),
    ["conflict", "conflict", "ready"],
  );
  await assert.rejects(
    db.transaction((trx) =>
      applyImportPreview(trx, actor.id, { previewId: preview.previewId, recordIds: ["8001"] }),
    ),
    /bloquée/u,
  );
  assert.deepEqual(await counts(db), before);
  await db("dossier").insert({ onagre_demande_identifier: "Demande : 2024–00512–011–001" });
  await assert.rejects(
    db.transaction((trx) =>
      applyImportPreview(trx, actor.id, { previewId: preview.previewId, recordIds: ["8003"] }),
    ),
    /périmé/u,
  );
  const refreshed = await createImportPreview(db, request, actor.id);
  assert.equal(refreshed.records[2].status, "conflict");
}
