import { error, json } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  createImportPreview,
  applyImportPreview,
  readImportRun,
  OnagreImportError,
} from "@pitchou/server/onagre/import.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import type { RequestHandler } from "./$types";

const headers = { "cache-control": "no-store" };

async function readBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 4096) error(413, "Requête trop volumineuse.");
  const reader = request.body?.getReader();
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          error(413, "Requête trop volumineuse.");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    error(400, "Requête JSON invalide.");
  }
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const run = await readImportRun(db, url.searchParams.get("runId") ?? "");
    if (!run) error(404, "Rapport d'import introuvable.");
    return json(run, { headers });
  } catch (cause) {
    if (cause instanceof OnagreImportError) error(cause.status, cause.message);
    throw cause;
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user?.id) error(401, "Authentification requise.");
  const body = await readBody(request);
  try {
    if (body?.action === "preview")
      return json(await createImportPreview(db, body, locals.user.id), { headers });
    if (body?.action === "apply")
      return json(
        await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
          applyImportPreview(trx, actor.id, body),
        ),
        { headers },
      );
    error(400, "Action d'import inconnue.");
  } catch (cause) {
    if (cause instanceof OnagreImportError) error(cause.status, cause.message);
    throw cause;
  }
};
