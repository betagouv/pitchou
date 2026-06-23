// Fichier avec divers prédicats / type guards
// https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates

import { isValidDateString } from "./typeFormat.ts";

import type {
  ChampDSPieceJustificative,
  ChampRépétéDSPieceJustificative,
} from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type {
  OiseauAtteint,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
} from "@pitchou/types/especes.d.ts";

export function isDossierRésuméArray(x: any): x is DossierRésumé[] {
  return Array.isArray(x) && x.every(isDossierRésumé);
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
 * Type guard to check if an object is a DossierRésumé
 */
function isDossierRésumé(x: any): x is DossierRésumé {
  if (!x || typeof x !== "object") return false;

  // Basic properties
  const basicPropsValid =
    typeof x.id === "number" &&
    (typeof x.nom === "string" || x.nom === null) &&
    (typeof x.number_demarches_simplifiées === "string" ||
      x.number_demarches_simplifiées === null) &&
    (typeof x.activité_principale === "string" || x.activité_principale === null) &&
    (typeof x.rattaché_au_régime_ae === "boolean" || x.rattaché_au_régime_ae === null) &&
    (typeof x.historique_identifiant_demande_onagre === "string" ||
      x.historique_identifiant_demande_onagre === null);

  if (!basicPropsValid) return false;

  // DossierLocalisation
  const locationValid =
    !x.communes ||
    (Array.isArray(x.communes) &&
      x.communes.every(isCommune) &&
      isOptionalStringArray(x.départements) &&
      isOptionalStringArray(x.régions));

  if (!locationValid) return false;

  // DossierPersonnesImpliquées
  const peopleValid =
    (typeof x.déposant_nom === "string" || x.déposant_nom === null) &&
    (typeof x.déposant_prénoms === "string" || x.déposant_prénoms === null) &&
    (typeof x.demandeur_personne_physique_nom === "string" ||
      x.demandeur_personne_physique_nom === null) &&
    (typeof x.demandeur_personne_physique_prénoms === "string" ||
      x.demandeur_personne_physique_prénoms === null) &&
    (typeof x.demandeur_personne_morale_raison_sociale === "string" ||
      x.demandeur_personne_morale_raison_sociale === null) &&
    (typeof x.demandeur_personne_morale_siret === "string" ||
      x.demandeur_personne_morale_siret === null);

  if (!peopleValid) return false;

  // DossierPhaseEtProchaineAction
  const phaseValid = typeof x.phase === "string";
  const actionValid =
    x.prochaine_action_attendue_par === null || typeof x.prochaine_action_attendue_par === "string";

  if (!phaseValid || !actionValid) return false;

  // DonnéesDossierPourStats
  const statsValid = isValidDateString(x.date_dépôt);

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

export function isChampRépétéDSPieceJustificative(x: any): x is ChampRépétéDSPieceJustificative {
  return (
    _isBaseChampDS(x) &&
    Array.isArray(x.rows) &&
    x.rows.every((r: any) => r.champs.every(isChampDSPieceJustificative))
  );
}
