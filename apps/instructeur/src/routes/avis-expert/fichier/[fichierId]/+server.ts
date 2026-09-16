import type { RequestHandler } from "./$types";
import { downloadFichierResponse } from "$lib/server/fichier";
import { requireFichierAccess } from "$lib/server/fichierAccess";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = async ({ params, url }) => {
  const fichierId = params.fichierId as FileId;
  // This route serves both sides of an avis expert: the saisine sent to the
  // expert and the avis received back.
  await requireFichierAccess(url, fichierId, ["avis", "saisine"]);
  return downloadFichierResponse(fichierId);
};
