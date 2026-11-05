import { error, json } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  changeImportJob,
  createImportJob,
  exportImportJob,
  listImportJobs,
  readImportJob,
} from "@pitchou/server/onagre/import/jobs.ts";
import { OnagreImportError } from "@pitchou/server/onagre/import.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { readImportBody } from "../importBody.ts";
import type { RequestHandler } from "./$types";

const headers = { "cache-control": "no-store" };
export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await readImportBody(request);
  try {
    if (body?.action === "analyze")
      return json(
        await withAdminWriteAccess(locals, "admin:access", (trx, actor) =>
          createImportJob(trx, actor.id, body.snapshotId),
        ),
        { headers },
      );
    if (body?.action === "import" || body?.action === "cancel")
      return json(
        await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
          changeImportJob(trx, actor.id, body.jobId, body.action),
        ),
        { headers },
      );
    error(400, "Action inconnue.");
  } catch (cause) {
    if (cause instanceof OnagreImportError) error(cause.status, cause.message);
    throw cause;
  }
};
export const GET: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get("jobId");
    if (!id) return json(await listImportJobs(db), { headers });
    const result = await readImportJob(db, id, Number(url.searchParams.get("page") ?? 1));
    if (url.searchParams.get("download") !== "1") return json(result, { headers });
    const iterator = exportImportJob(db, id);
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        async pull(controller) {
          try {
            const { done, value } = await iterator.next();
            if (done) controller.close();
            else controller.enqueue(encoder.encode(value));
          } catch (cause) {
            controller.error(cause);
          }
        },
        async cancel() {
          await iterator.return();
        },
      }),
      {
        headers: {
          ...headers,
          "content-type": "application/x-ndjson",
          "content-disposition": `attachment; filename="onagre-${id}.jsonl"`,
        },
      },
    );
  } catch (cause) {
    if (cause instanceof OnagreImportError) error(cause.status, cause.message);
    throw cause;
  }
};
