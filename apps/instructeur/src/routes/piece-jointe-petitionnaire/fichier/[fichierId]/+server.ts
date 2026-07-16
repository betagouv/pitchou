import type { RequestHandler } from "./$types";
import { downloadFichierResponse } from "$lib/server/fichier";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const GET: RequestHandler = ({ params }) => {
  return downloadFichierResponse(params.fichierId as FileId);
};
