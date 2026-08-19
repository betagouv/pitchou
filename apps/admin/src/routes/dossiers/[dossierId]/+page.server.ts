import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import { simulatableChamps, simulationAllowed } from "$lib/server/simulation.ts";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId);

  try {
    const detail = await getDossierDetailForAdmin(dossierId);
    return {
      detail: JSON.parse(JSON.stringify(detail)) as AdminDossierDetail,
      // Outside production only: the panel is not even sent to the browser there.
      simulation: simulationAllowed() ? { champs: simulatableChamps } : undefined,
    };
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};
