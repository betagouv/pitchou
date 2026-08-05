import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId);

  try {
    const detail = await getDossierDetailForAdmin(dossierId);
    return { detail: JSON.parse(JSON.stringify(detail)) as AdminDossierDetail };
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
