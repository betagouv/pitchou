import { json } from "@sveltejs/kit";
import { readExternalDossier } from "@pitchou/server/database/externalApi/dossiers.ts";
import { withDossierRead } from "#lib/server/externalApi/read.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params }) =>
  withDossierRead(locals, params.id, async (id, _internal, trx, _principal, access) =>
    json(await readExternalDossier(id, access, trx)),
  );
