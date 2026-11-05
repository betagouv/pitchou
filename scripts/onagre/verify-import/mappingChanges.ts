import assert from "node:assert/strict";
import {
  createImportPreview,
  applyImportPreview,
  OnagreImportError,
} from "@pitchou/server/onagre/import.ts";
import { counts, type Database } from "./fixtures.ts";

export async function verifyMappingChanges(db: Database, actorId: number, snapshotId: number) {
  const preview = (id = "50006") =>
    createImportPreview(db, { snapshotId, recordIds: [id] }, actorId);
  const apply = (id: string) =>
    db.transaction((trx) =>
      applyImportPreview(trx, actorId, { previewId: id, recordIds: ["50006"] }),
    );
  const refQuery = () =>
    db("onagre_source_row").where({ snapshot_id: snapshotId, table_name: "services" });
  const original = (await refQuery().first()).content;
  const stale = await preview();
  await refQuery().update({ content: { ...original, nomservice: "Nom corrigé" } });
  const before = await counts(db);
  await assert.rejects(
    apply(stale.previewId),
    (e: unknown) => e instanceof OnagreImportError && e.status === 409,
  );
  assert.deepEqual(await counts(db), before);
  assert.equal(
    (await preview("50001")).records[0].status,
    "conflict",
    "reference-only changes affect existing imports",
  );
  await refQuery().update({ content: original });
  const catalogue = await preview();
  await db("activite_label")
    .where({ activite_code: "transport-routier" })
    .update({ needs_review: true });
  await assert.rejects(apply(catalogue.previewId));
  const unresolved = await preview();
  assert.equal(unresolved.records[0].plan!.columns.main_activite, undefined);
  await db("activite_label")
    .where({ activite_code: "transport-routier" })
    .update({ needs_review: false });
  const mappingQuery = () => db("onagre_mapping").where({ key: "field:demandes.lieux" });
  const mapping = await mappingQuery().first();
  await mappingQuery().update({ rule: "Modifier le texte selon une nouvelle règle" });
  const changed = await preview();
  assert(!changed.records[0].plan!.columns.description!.includes("Ligne 1"));
  assert(changed.records[0].omissions.some((s) => s.includes("demandes.lieux")));
  assert.equal((await preview("50001")).records[0].status, "conflict");
  await mappingQuery().update({ rule: mapping.rule });
  const identity = await db("onagre_import_identity").where({ source_id: 50001 }).first();
  await db("dossier")
    .where({ id: identity.dossier_id })
    .update({ description: "Ajout de l'instructeur" });
  assert.equal((await preview("50001")).records[0].status, "conflict");
  assert.equal(
    (await db("dossier").where({ id: identity.dossier_id }).first()).description,
    "Ajout de l'instructeur",
  );
  await db("onagre_import_identity")
    .where({ source_id: 50002 })
    .update({ profile_version: "experimental-skeleton-v1" });
  assert.equal(
    (await preview("50002")).records[0].status,
    "conflict",
    "v1 dossiers are not duplicated or silently upgraded",
  );
  console.log(
    "PASS: reference-only drift, changed activity catalogue, unsupported rules, changed targets and earlier profiles cannot overwrite or duplicate dossiers.",
  );
}
