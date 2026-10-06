import { requireDossierAccess } from "$lib/requireDossierAccess.ts";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ parent }) => {
  await parent();
  requireDossierAccess();
};
