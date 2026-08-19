import { departements } from "@pitchou/common/departements.ts";
import {
  aeProcedureOptions,
  dossierLocationScopeOptions,
  dossierRegionOptions,
  dossierRequestContextOptions,
  eolienMortalityActionOptions,
  especesPriseDetentionLimiteeTypeOptions,
  legacyMotifDerogationOptions,
  motifDerogationOptions,
  scientifiqueDemandePurposeOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

// The accepted « Activité principale » values come from the activity referentiel, not from a
// hardcoded list — see activiteContext.ts.
export const REQUEST_CONTEXT_VALUES = new Set<string>(dossierRequestContextOptions);
export const MOTIF_DEROGATION_VALUES = new Set<string>([
  ...motifDerogationOptions,
  ...legacyMotifDerogationOptions,
]);
export const AE_PROCEDURE_VALUES = new Set<string>(aeProcedureOptions);
export const EOLIEN_MORTALITY_ACTION_VALUES = new Set<string>(eolienMortalityActionOptions);
export const ESPECES_PRISE_DETENTION_LIMITEE_TYPE_VALUES = new Set<string>(
  especesPriseDetentionLimiteeTypeOptions,
);
export const SCIENTIFIQUE_DEMANDE_TYPE_VALUES = new Set<string>(scientifiqueDemandeTypeOptions);
export const SCIENTIFIQUE_DEMANDE_PURPOSE_VALUES = new Set<string>(
  scientifiqueDemandePurposeOptions,
);
export const DEPARTEMENT_VALUES = new Set<string>(departements.map(({ code }) => code));
export const REGION_VALUES = new Set<string>(dossierRegionOptions);
export const LOCATION_SCOPE_VALUES = new Set<string>(dossierLocationScopeOptions);
