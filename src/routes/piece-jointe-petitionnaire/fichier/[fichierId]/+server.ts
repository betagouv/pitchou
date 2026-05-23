import type { RequestHandler } from "./$types";
import { téléchargementFichierResponse } from "$lib/server/fichier";
import type { FichierId } from "$types/database/public/Fichier.ts";

export const GET: RequestHandler = ({ params }) => {
  return téléchargementFichierResponse(params.fichierId as FichierId);
};
