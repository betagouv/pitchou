import { requireDossierAccess } from "$lib/requireDossierAccess.ts";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ parent }) => {
  await parent();
  requireDossierAccess();

  // The dossier list spreads over the whole viewport so the tiles can show more.
  return { fullWidth: true };
};
