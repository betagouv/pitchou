import { telechargementFichierResponse } from "$lib/server/fichier";
import type { FileId } from "@pitchou/types/database/public/File.js";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params }) => {
  return telechargementFichierResponse(params.fichierId as FileId);
};
