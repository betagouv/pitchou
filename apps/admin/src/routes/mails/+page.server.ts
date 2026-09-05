import { getDossierCnpnEmailStats } from "@pitchou/server/database/dossier_cnpn_email.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  stats: await getDossierCnpnEmailStats(),
});
