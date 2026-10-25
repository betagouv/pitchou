import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";
import { capture } from "./capture.ts";
import {
  getImportAvailability,
  POLICY,
  positiveInteger,
  recordIds,
  SOURCE_INSTANCE,
} from "./policy.ts";
import { cachePreview, PREVIEW_TTL_MS } from "./state.ts";

export async function createImportPreview(
  connection: Knex,
  request: { snapshotId: number; recordIds: string[] },
  actorId: number,
): Promise<OnagreImportPreview> {
  const snapshotId = positiveInteger(request.snapshotId);
  const ids = recordIds(request.recordIds);
  return connection.transaction(
    async (trx) => {
      await trx.raw("SET LOCAL statement_timeout = '15s'");
      const captured = await capture(trx, snapshotId, ids);
      const now = Date.now();
      const preview: OnagreImportPreview = {
        previewId: randomUUID(),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + PREVIEW_TTL_MS).toISOString(),
        sourceInstance: SOURCE_INSTANCE,
        snapshotId,
        snapshotFingerprint: captured.frozen.snapshot.fingerprint as string,
        policy: structuredClone(POLICY),
        mappingHash: captured.mappingHash,
        inputHash: captured.inputHash,
        targetHash: captured.targetHash,
        availability: getImportAvailability(),
        records: captured.records,
      };
      cachePreview({ input: { ...captured.frozen, preview }, actorId });
      return preview;
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}
