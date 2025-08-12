import { isValidDateString } from '../commun/typeFormat.js'

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {OiseauAtteint, FauneNonOiseauAtteinte, FloreAtteinte} from '../types/especes.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierRésumé} from '../types/API_Pitchou.ts' */

/** 
 * 
 * @param {any} x 
 * @returns {x is DossierRésumé[]} 
 */
export function isDossierRésuméArray(x){
  return Array.isArray(x) && x.every(isDossierRésumé) 
}

/**
 * @param {any} value
 * @returns {value is DossierDémarcheSimplifiée88444Communes}
 */
const isCommune = (value) => {
  return value
      && typeof value.name === 'string'
      && typeof value.code === 'string'
      && typeof value.postalCode === 'string';
};

/**
* @param {any} value
* @returns {value is string[] | null | undefined}
*/
const isOptionalStringArray = (value) => {
  return value === null 
      || value === undefined 
      || (Array.isArray(value) && value.every(item => typeof item === 'string'));
};

/**
* Type guard to check if an object is a DossierRésumé
* @param {any} x - The object to check
* @returns {x is DossierRésumé} - True if the object matches DossierRésumé structure
*/
function isDossierRésumé(x) {
  if (!x || typeof x !== 'object') return false;

  // Basic properties
  const basicPropsValid = (
      typeof x.id === 'number'
      && (typeof x.nom === 'string' || x.nom === null)
      && (typeof x.number_demarches_simplifiées === 'string' || x.number_demarches_simplifiées === null)
      && (typeof x.activité_principale === 'string' || x.activité_principale === null)
      && (typeof x.enjeu_politique === 'boolean' || x.enjeu_politique === null)
      && (typeof x.enjeu_écologique === 'boolean' || x.enjeu_écologique === null)
      && (typeof x.rattaché_au_régime_ae === 'boolean' || x.rattaché_au_régime_ae === null)
      && (typeof x.historique_identifiant_demande_onagre === 'string' || x.historique_identifiant_demande_onagre === null)
  );

  if (!basicPropsValid) return false;

  // DossierLocalisation
  const locationValid = (
      !x.communes || 
      (
        Array.isArray(x.communes) && x.communes.every(isCommune)
        && isOptionalStringArray(x.départements)
        && isOptionalStringArray(x.régions)
      )
  );

  if (!locationValid) return false;

  // DossierPersonnesImpliquées
  const peopleValid = (
      (typeof x.déposant_nom === 'string' || x.déposant_nom === null)
      && (typeof x.déposant_prénoms === 'string' || x.déposant_prénoms === null)
      && (typeof x.demandeur_personne_physique_nom === 'string' || x.demandeur_personne_physique_nom === null)
      && (typeof x.demandeur_personne_physique_prénoms === 'string' || x.demandeur_personne_physique_prénoms === null)
      && (typeof x.demandeur_personne_morale_raison_sociale === 'string' || x.demandeur_personne_morale_raison_sociale === null)
      && (typeof x.demandeur_personne_morale_siret === 'string' || x.demandeur_personne_morale_siret === null)
  );

  if (!peopleValid) return false;

  // DossierPhaseEtProchaineAction
  const phaseValid = typeof x.phase === 'string';
  const actionValid = x.prochaine_action_attendue_par === null || typeof x.prochaine_action_attendue_par === 'string';

  if (!phaseValid || !actionValid) return false;

  // DonnéesDossierPourStats
  const statsValid = isValidDateString(x.date_dépôt)

  return statsValid;
};

/**
 * 
 * @param {any} e 
 * @returns {e is OiseauAtteint} 
 */
export function isOiseauAtteint(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object") &&
    (e.nombreNids === undefined || typeof e.nombreNids === "number") &&
    (e.nombreOeufs === undefined || typeof e.nombreOeufs === "number")
  )
}

/**
 * 
 * @param {any} e 
 * @returns {e is FauneNonOiseauAtteinte} 
 */
export function isFauneNonOiseauAtteinte(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "faune non-oiseau" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object") &&
    (e.méthode === undefined || typeof e.méthode === "object") &&
    (e.transport === undefined || typeof e.transport === "object")
  )
}

/**
 * 
 * @param {any} e 
 * @returns {e is FloreAtteinte} 
 */
export function isFloreAtteinte(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof e.espèce === "object" && e.espèce.classification === "flore" &&
    (e.nombreIndividus === undefined || typeof e.nombreIndividus === "string") &&
    (e.surfaceHabitatDétruit === undefined || typeof e.surfaceHabitatDétruit === "number") &&
    (e.activité === undefined || typeof e.activité === "object")
  )
}