import type { Knex } from "knex";
import type { OnagreImportRun } from "@pitchou/types/onagreImport.ts";
import { capture } from "./capture.ts";
import { assertImportEnabled, hash, OnagreImportError, POLICY, recordIds, uuid } from "./policy.ts";
import { getCachedPreview } from "./state.ts";
import { writeRun } from "./writer.ts";

export async function readImportRun(
  connection: Knex,
  runId: string,
): Promise<OnagreImportRun | null> {
  const row = await connection("onagre_import_run")
    .where({ id: uuid(runId) })
    .first("report");
  return row?.report ?? null;
}

export async function applyImportPreview(
  trx: Knex.Transaction,
  actorId: number,
  request: { previewId: string; recordIds: string[] },
): Promise<OnagreImportRun> {
  assertImportEnabled();
  const previewId = uuid(request.previewId);
  const ids = recordIds(request.recordIds);
  await trx.raw("SET LOCAL statement_timeout = '15s'");
  await trx.raw("SET LOCAL lock_timeout = '3s'");
  // The permission lock comes first, as it does in withAdminWriteAccess.
  await trx.raw("select pg_advisory_xact_lock(2105102026)");
  await trx.raw("select pg_advisory_xact_lock(29102026)");
  const existing = await trx("onagre_import_run").where({ preview_id: previewId }).first("report");
  if (existing) {
    const report = existing.report as OnagreImportRun;
    if (report.actorId !== actorId || hash(report.recordIds) !== hash(ids))
      throw new OnagreImportError("Cet aperçu a déjà été appliqué avec une autre sélection.", 409);
    return report;
  }
  const frozen = getCachedPreview(previewId, actorId);
  const { preview } = frozen;
  if (
    ids.some(
      (id) =>
        !preview.records.some(
          (r) => r.recordId === id && ["ready", "already_imported"].includes(r.status),
        ),
    )
  )
    throw new OnagreImportError(
      "La sélection contient une demande absente ou bloquée dans l'aperçu.",
    );
  // v1 is a sample of at most 10 records. Brief table locks also exclude writers
  // that do not participate in the importer advisory lock, including legacy code.
  await trx.raw(`LOCK TABLE onagre_snapshot, onagre_source_demande, onagre_mapping,
    onagre_mapping_revision, onagre_shared_rule, onagre_shared_rule_revision IN SHARE MODE`);
  await trx.raw("LOCK TABLE dossier, onagre_import_identity IN SHARE ROW EXCLUSIVE MODE");
  const current = await capture(
    trx,
    preview.snapshotId,
    preview.records.map((r) => r.recordId),
  );
  if (
    preview.policy.version !== POLICY.version ||
    current.mappingHash !== preview.mappingHash ||
    current.inputHash !== preview.inputHash ||
    current.targetHash !== preview.targetHash
  )
    throw new OnagreImportError(
      "Aperçu périmé. La source, les décisions ou la cible ont changé. Recréez l'aperçu.",
      409,
    );
  return writeRun(trx, actorId, frozen, ids);
}
