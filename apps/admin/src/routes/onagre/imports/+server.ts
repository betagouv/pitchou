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

import { readImportBody } from "../importBody.ts";

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
  const body = await readImportBody(request);
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
