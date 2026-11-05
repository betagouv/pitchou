import { readFile, writeFile } from "node:fs/promises";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { getSessionUser } from "@pitchou/server/users.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";
import {
  applyImportPreview,
  createImportPreview,
  readImportRun,
  recordIds,
  positiveInteger,
} from "@pitchou/server/onagre/import.ts";

// This first CLI is deliberately limited to a local rehearsal database.
const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (
  !databaseUrl ||
  databaseUrl.search ||
  !["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname)
)
  throw new Error("Use an explicitly configured local rehearsal DATABASE_URL.");

const [command, ...args] = process.argv.slice(2);
try {
  if (command === "preview" && args.length === 4) {
    const [snapshot, selection, actor, output] = args;
    const preview = await createImportPreview(
      db,
      {
        snapshotId: positiveInteger(Number(snapshot)),
        recordIds: recordIds(selection.split(",")),
      },
      positiveInteger(Number(actor)),
    );
    await writeFile(output, JSON.stringify(preview, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(`Aperçu écrit dans ${output}. Aucune écriture en base.`);
  } else if (command === "apply" && args.length === 3) {
    const [filename, selection, actor] = args;
    const previous: OnagreImportPreview = JSON.parse(await readFile(filename, "utf8"));
    const ids = recordIds(selection.split(","));
    const actorId = positiveInteger(Number(actor));
    const preview = await createImportPreview(
      db,
      {
        snapshotId: previous.snapshotId,
        recordIds: previous.records.map((r) => r.recordId),
      },
      actorId,
    );
    if (
      previous.mappingHash !== preview.mappingHash ||
      previous.inputHash !== preview.inputHash ||
      previous.targetHash !== preview.targetHash ||
      previous.policy.version !== preview.policy.version ||
      previous.sourceInstance !== preview.sourceInstance ||
      !Number.isFinite(Date.parse(previous.expiresAt)) ||
      Date.parse(previous.expiresAt) <= Date.now()
    )
      throw new Error("Aperçu périmé. Recréez-le et vérifiez les changements avant de reprendre.");
    const run = await db.transaction(async (trx) => {
      await trx.raw("select pg_advisory_xact_lock(2105102026)");
      const user = await getSessionUser(actorId as UserId, trx);
      if (
        !user?.permissions.includes("admin:access") ||
        !user.permissions.includes("admin:onagre:manage")
      )
        throw new Error("L'acteur doit avoir admin:access et admin:onagre:manage.");
      return applyImportPreview(trx, actorId, { previewId: preview.previewId, recordIds: ids });
    });
    console.log(JSON.stringify(run, null, 2));
  } else if (command === "report" && args.length === 1) {
    const run = await readImportRun(db, args[0]);
    if (!run) throw new Error("Rapport introuvable.");
    console.log(JSON.stringify(run, null, 2));
  } else {
    throw new Error(
      "Usage: preview <snapshotId> <id,id> <actorId> <new-file.json> | apply <preview.json> <id,id> <actorId> | report <runId>",
    );
  }
} finally {
  await db.destroy();
}
