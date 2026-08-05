import { json } from "@sveltejs/kit";
import { getReferentielRows } from "@pitchou/server/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import type { RequestHandler } from "./$types";

// The raw rows rather than the indexed bundle: Maps do not survive JSON, so the browser builds
// the bundle itself with `referentielRowsToBundle`.
export const GET: RequestHandler = async () => {
  return json(await getReferentielRows());
};
