import { error } from "@sveltejs/kit";
import {
  ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT,
  activiteCodeForLabel,
  RESTAURATION_BATIMENTS_ACTIVITE_CODE,
  TRANSPORT_ACTIVITE_CODES,
} from "@pitchou/common/activiteCodes.ts";
import {
  dossierRequestContextOptions,
  requiresEspecesPriseDetentionLimiteeType,
  requiresScientificDemandeType,
  requiresSpeciesFile,
} from "@pitchou/common/dossierFormOptions.ts";
import type { DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { ActiviteContext } from "./activiteContext.ts";

const CODES_WITHOUT_CONTEXT = new Set<string>(ACTIVITE_CODES_WITHOUT_REQUEST_CONTEXT);

export function isValidPhone(phone: string): boolean {
  const digits = phone.replaceAll(/\D/g, "");
  return /^\+?[0-9(). -]+$/.test(phone) && digits.length >= 10 && digits.length <= 15;
}

export function validateCreationCore(
  columns: DossierMutator,
  raw: Record<string, unknown>,
  activiteContext: ActiviteContext,
) {
  const phone = columns.urgent_contact_phone;
  if (typeof phone !== "string" || !isValidPhone(phone))
    error(400, `Property 'urgent_contact_phone' must be a valid phone number.`);
  const mainActivite = columns.main_activite;
  if (typeof mainActivite !== "string") error(400, `Property 'main_activite' is required.`);
  // Historical labels stay valid on edits, but a new dossier only carries a current activity name.
  if (!activiteContext.canonicalLabels.has(mainActivite))
    error(400, `Property 'main_activite' is invalid.`);
  const activiteCode = activiteCodeForLabel(mainActivite, activiteContext.codeByLabel);
  const displaysContext = !CODES_WITHOUT_CONTEXT.has(activiteCode ?? "");
  const requestContext = columns.request_context;
  if (displaysContext && typeof requestContext !== "string")
    error(400, `Property 'request_context' is required for this main activity.`);
  if (!displaysContext && requestContext !== null)
    error(400, `Property 'request_context' does not apply to this main activity.`);
  if (
    requestContext === dossierRequestContextOptions[0] &&
    (typeof columns.accompaniment_need !== "string" || !columns.accompaniment_need.trim())
  ) {
    error(400, `Property 'accompaniment_need' is required for upstream support.`);
  }
  if (requestContext !== dossierRequestContextOptions[0] && columns.accompaniment_need !== null)
    error(400, `Property 'accompaniment_need' does not apply to this request context.`);
  const requiresDetail =
    activiteCode === RESTAURATION_BATIMENTS_ACTIVITE_CODE ||
    TRANSPORT_ACTIVITE_CODES.includes(activiteCode as never);
  if (requiresDetail && !Object.hasOwn(raw, "type"))
    error(400, `Property 'type' is required for this main activity.`);
  if (
    activiteCode === RESTAURATION_BATIMENTS_ACTIVITE_CODE &&
    columns.type !== null &&
    columns.type !== "Hirondelle"
  )
    error(400, `Property 'type' is invalid for this main activity.`);
  if (
    TRANSPORT_ACTIVITE_CODES.includes(activiteCode as never) &&
    columns.type !== null &&
    columns.type !== "Cigogne"
  )
    error(400, `Property 'type' is invalid for this main activity.`);
  if (!requiresDetail && columns.type !== null)
    error(400, `Property 'type' does not apply to this main activity.`);
  if (typeof columns.location_scope !== "string")
    error(400, `Property 'location_scope' is required.`);
  if (typeof columns.primary_department !== "string")
    error(400, `Property 'primary_department' is required.`);
  if (columns.location_scope === "communes" && !Array.isArray(raw.communes))
    error(400, `Property 'communes' is required for the commune location scope.`);
  if (columns.location_scope === "regions" && !Array.isArray(raw.regions))
    error(400, `Property 'regions' is required for the region location scope.`);
  const requiresJustification = requiresSpeciesFile(activiteCode, requestContext as string | null);
  if (requiresJustification) {
    if (
      typeof columns.no_other_satisfactory_solution_justification !== "string" ||
      !columns.no_other_satisfactory_solution_justification.trim()
    )
      error(400, `Property 'no_other_satisfactory_solution_justification' is required.`);
    if (typeof columns.motif_derogation !== "string")
      error(400, `Property 'motif_derogation' is required.`);
    if (
      typeof columns.motif_derogation_justification !== "string" ||
      !columns.motif_derogation_justification.trim()
    )
      error(400, `Property 'motif_derogation_justification' is required.`);
  } else if (
    columns.no_other_satisfactory_solution_justification !== null ||
    columns.motif_derogation !== null ||
    columns.motif_derogation_justification !== null
  ) {
    error(400, `Derogation justification properties do not apply to this application.`);
  }
  if (requiresScientificDemandeType(columns.motif_derogation)) {
    if (!Array.isArray(raw.scientifique_demande_type) || raw.scientifique_demande_type.length === 0)
      error(400, `Property 'scientifique_demande_type' requires at least one value.`);
  } else if (columns.scientifique_demande_type !== null)
    error(400, `Property 'scientifique_demande_type' does not apply to this derogation reason.`);
  if (typeof columns.description !== "string" || !columns.description.trim())
    error(400, `Property 'description' is required.`);
  if (typeof raw.linked_to_ae_regime !== "boolean" && raw.linked_to_ae_regime !== "unknown")
    error(400, `Property 'linked_to_ae_regime' is required.`);
  if (raw.linked_to_ae_regime === true) {
    if (!Array.isArray(raw.ae_procedures) || raw.ae_procedures.length === 0)
      error(400, `Property 'ae_procedures' requires at least one value.`);
    if (
      raw.ae_procedures.includes("Autre") &&
      (typeof columns.ae_other_procedure !== "string" || !columns.ae_other_procedure.trim())
    )
      error(400, `Property 'ae_other_procedure' is required.`);
  } else if (columns.ae_procedures !== null || columns.ae_other_procedure !== null)
    error(400, `AE procedure properties do not apply to this application.`);
  const destroyedRequired =
    activiteCode === RESTAURATION_BATIMENTS_ACTIVITE_CODE && columns.type === "Hirondelle";
  if (
    destroyedRequired &&
    (typeof columns.dossier_oiseau_simple_destroyed_nids_count !== "number" ||
      columns.dossier_oiseau_simple_destroyed_nids_count < 1)
  )
    error(400, `Property 'dossier_oiseau_simple_destroyed_nids_count' is required.`);
  if (!destroyedRequired && columns.dossier_oiseau_simple_destroyed_nids_count !== null)
    error(400, `Property 'dossier_oiseau_simple_destroyed_nids_count' does not apply.`);
  const limitedTaking = requiresEspecesPriseDetentionLimiteeType(columns.motif_derogation);
  if (limitedTaking && typeof columns.especes_prise_detention_limitee_type !== "string")
    error(400, `Property 'especes_prise_detention_limitee_type' is required.`);
  if (!limitedTaking && columns.especes_prise_detention_limitee_type !== null)
    error(400, `Property 'especes_prise_detention_limitee_type' does not apply.`);
}
