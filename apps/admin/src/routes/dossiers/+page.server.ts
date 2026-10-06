import { listUnmatchedDossiersForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  unmatched: await listUnmatchedDossiersForAdmin(),
});
