// File with various predicates / type guards
// https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

import { isValidDateString } from "./typeFormat.ts";

import type {
  ChampDSPieceJustificative,
  ChampRepeteDSPieceJustificative,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type {
  OiseauAtteint,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
} from "@pitchou/types/especes.d.ts";

export function isDossierSummaryArray(x: any): x is DossierSummary[] {
  return Array.isArray(x) && x.every(isDossierSummary);
}

const isCommune = (value: any): value is { name: string; code: string; postalCode: string } => {
  return (
    value &&
    typeof value.name === "string" &&
    typeof value.code === "string" &&
    typeof value.postalCode === "string"
  );
};

const isOptionalStringArray = (value: any): value is string[] | null | undefined => {
  return (
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
};

/**
 * Type guard to check if an object is a DossierSummary
 */
function isDossierSummary(x: any): x is DossierSummary {
  if (!x || typeof x !== "object") return false;

  // Basic properties
  const basicPropsValid =
    typeof x.id === "number" &&
    (typeof x.name === "string" || x.name === null) &&
    (typeof x.demarche_numerique_number === "string" || x.demarche_numerique_number === null) &&
    (typeof x.main_activite === "string" || x.main_activite === null) &&
    (typeof x.linked_to_ae_regime === "boolean" || x.linked_to_ae_regime === null) &&
    (typeof x.onagre_demande_identifier === "string" || x.onagre_demande_identifier === null);

  if (!basicPropsValid) return false;

  // DossierLocalisation
  const locationValid =
    !x.communes ||
    (Array.isArray(x.communes) &&
      x.communes.every(isCommune) &&
      isOptionalStringArray(x.departments) &&
      isOptionalStringArray(x.regions));

  if (!locationValid) return false;

  // DossierPersonnesImpliquées
  const peopleValid =
    (typeof x.deposant_last_name === "string" || x.deposant_last_name === null) &&
    (typeof x.deposant_first_names === "string" || x.deposant_first_names === null) &&
    (typeof x.demandeur_personne_physique_last_name === "string" ||
      x.demandeur_personne_physique_last_name === null) &&
    (typeof x.demandeur_personne_physique_first_names === "string" ||
      x.demandeur_personne_physique_first_names === null) &&
    (typeof x.demandeur_personne_morale_legal_name === "string" ||
      x.demandeur_personne_morale_legal_name === null) &&
    (typeof x.demandeur_personne_morale_siret === "string" ||
      x.demandeur_personne_morale_siret === null);

  if (!peopleValid) return false;

  // DossierPhaseEtProchaineAction
  const phaseValid = typeof x.phase === "string";
  const actionValid =
    x.next_action_expected_from === null || typeof x.next_action_expected_from === "string";

  if (!phaseValid || !actionValid) return false;

  // DonnéesDossierPourStats
  const statsValid = isValidDateString(x.depot_date);

  return statsValid;
}

export function isOiseauAtteint(e: any): e is OiseauAtteint {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" &&
    e.espèce.classification === "oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object") &&
    (e.nombreNids === undefined || typeof e.nombreNids === "number") &&
    (e.nombreOeufs === undefined || typeof e.nombreOeufs === "number")
  );
}

export function isFauneNonOiseauAtteinte(e: any): e is FauneNonOiseauAtteinte {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" &&
    e.espèce.classification === "faune non-oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object")
  );
}

export function isFloreAtteinte(e: any): e is FloreAtteinte {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" &&
    e.espèce.classification === "flore" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object")
  );
}

export function _isBaseChampDS(x: any): boolean {
  return x && typeof x === "object" && typeof x.id === "string" && typeof x.label === "string";
}

export function isChampDSPieceJustificative(x: any): x is ChampDSPieceJustificative {
  return _isBaseChampDS(x) && Array.isArray(x.files);
}

export function isChampRepeteDSPieceJustificative(x: any): x is ChampRepeteDSPieceJustificative {
  return (
    _isBaseChampDS(x) &&
    Array.isArray(x.rows) &&
    x.rows.every((r: any) => r.champs.every(isChampDSPieceJustificative))
  );
}
