import { getActiviteReferentiel } from "@pitchou/server/database/activite.ts";
import { listGroups } from "@pitchou/server/administration.ts";
import { DEPARTEMENT_VALUES } from "#lib/server/dossierValidation/columnAcceptedValues.ts";
export async function loadGroupDirectory() {
  return {
    ...(await listGroups()),
    activites: (await getActiviteReferentiel()).activites,
    departments: [...DEPARTEMENT_VALUES].sort(),
  };
}
