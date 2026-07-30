import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId);

  try {
    return { detail: await getDossierDetailForAdmin(dossierId) };
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
