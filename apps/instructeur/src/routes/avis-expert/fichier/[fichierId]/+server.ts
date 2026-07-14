import type { RequestHandler } from "./$types";
import { telechargementFichierResponse } from "$lib/server/fichier";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = ({ params }) => {
  return telechargementFichierResponse(params.fichierId as FileId);
};
