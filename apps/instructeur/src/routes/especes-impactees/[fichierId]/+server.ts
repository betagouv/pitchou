import type { RequestHandler } from "./$types";
import { downloadFichierResponse } from "$lib/server/fichier";
import { requireFichierAccess } from "$lib/server/fichierAccess";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = async ({ params, url }) => {
  const fichierId = params.fichierId as FileId;
  await requireFichierAccess(url, fichierId, ["especes-impactees"]);
  return downloadFichierResponse(fichierId);
};
