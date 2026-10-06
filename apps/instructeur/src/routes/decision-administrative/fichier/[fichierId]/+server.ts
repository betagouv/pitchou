import type { RequestHandler } from "./$types";
import { downloadFichierResponse } from "$lib/server/fichier";
import { requireFichierAccess } from "$lib/server/fichierAccess";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = async ({ params, url, locals }) => {
  const fichierId = params.fichierId as FileId;
  await requireFichierAccess(url, locals, fichierId, ["decision-administrative"]);
  return downloadFichierResponse(fichierId);
};
