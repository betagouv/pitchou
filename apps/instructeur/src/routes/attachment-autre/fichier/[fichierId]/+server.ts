import { téléchargementFichierResponse } from "$lib/server/fichier";

import type { RequestHandler } from "./$types";
import type { FichierId } from "@pitchou/types/database/public/Fichier.ts";

export const GET: RequestHandler = ({ params }) => {
  return téléchargementFichierResponse(params.fichierId as FichierId);
};
