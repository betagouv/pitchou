import type { RequestHandler } from "./$types";
import { téléchargementFichierResponse } from "$lib/server/fichier";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = ({ params }) => {
  return téléchargementFichierResponse(params.fichierId as FileId);
};
