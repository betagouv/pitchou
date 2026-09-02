import { json } from "@sveltejs/kit";
import { getActiviteReferentiel } from "@pitchou/server/database/activite.ts";
import type { RequestHandler } from "./$types";

// The activity referentiel (groups, activities, labels), used by the dossier filters to build
// the grouped activity dropdown. Same referentiel the admin app manages on /activites.
export const GET: RequestHandler = async () => {
  return json(await getActiviteReferentiel());
};
