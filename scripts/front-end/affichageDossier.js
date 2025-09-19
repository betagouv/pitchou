//@ts-check

import { differenceInDays, format, formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {DossierPhase, DossierProchaineActionAttenduePar, DossierRésumé, DossierComplet} from '../types/API_Pitchou.d.ts' */

/**
 * @param {Partial<DossierComplet>} localisation
 * @returns {string} 
 */
export function formatLocalisation({communes, départements, régions}){
    // Nettoyage du cas où un dossier a dit qu'il était sur plusieurs communes, mais n'a pas saisi les communes
    if(Array.isArray(communes) && communes.length === 0){
        communes = undefined
    }

    // Régions
    if(!communes && !départements && régions){
        return `Régions: ${régions.join(', ')}`
    }

    // Départements
    if(!communes && départements){
        return départements.join(', ')
    }

    // Communes
    if(
        !communes ||
        (!communes && !départements) || 
        (
            (communes && Array.isArray(communes) && communes.length === 0) && 
            (!départements || départements.length === 0)
        )
    ){
        return '(inconnue)'
    }

    return communes.map(({name}) => name).join(', ') + ' ' + `(${Array.isArray(départements) ? départements.join(', ') : ''})`
}





/**
 * @param {DossierComplet | DossierRésumé} dossier
 * @returns {string} 
 */
function formatDéposant(dossier){
    const INCONNU = '(inconnu)'

    let {déposant_nom, déposant_prénoms} = dossier

    if(!déposant_nom && !déposant_prénoms){
        if ("déposant_email" in dossier) {
            return dossier.déposant_email ?? INCONNU
        }
        return INCONNU
    }
    if(!déposant_nom){
        déposant_nom = ''
    }
    if(!déposant_prénoms){
        déposant_prénoms = ''
    }

    return déposant_nom ? déposant_nom + ' ' + déposant_prénoms : déposant_prénoms
}

/**
 * 
 * @param {DossierComplet | DossierRésumé} dossier 
 * @returns {string} 
 */
export function formatPorteurDeProjet(dossier){
    if(dossier.demandeur_personne_morale_siret){
        return `${dossier.demandeur_personne_morale_raison_sociale} (${dossier.demandeur_personne_morale_siret})`
    }
    else{
        if(dossier.demandeur_personne_physique_nom){
            return dossier.demandeur_personne_physique_nom + ' ' + dossier.demandeur_personne_physique_prénoms
        }
        else{
            return formatDéposant(dossier)
        }
    }
}


/**
 *
 * @param {Date | undefined | null} date
 * @returns {string}
 */
export function formatDateAbsolue(date) {
    if(!date){
        return '(date inconnue)'
    }

    return format(date, 'd MMMM yyyy', { locale: fr })
}
  
  /**
   *
   * @param {Date | undefined | null} date
   * @returns {string}
   */
export function formatDateRelative(date) {
    if(!date){
        return '(date inconnue)'
    }

    if (differenceInDays(date, new Date()) === 0) {
      return `Aujourd'hui`
    }
    if (Math.abs(differenceInDays(date, new Date())) <= 7) {
      return formatRelative(date, new Date(), {locale: fr })
    }
  
    return formatDateAbsolue(date)
}

/** @type {Set<DossierPhase>} */
export const phases = new Set([
    "Accompagnement amont",
    "Étude recevabilité DDEP",
    "Instruction",
    "Contrôle",
    "Classé sans suite",
    "Obligations terminées"
])

/** @type {Set<DossierProchaineActionAttenduePar>} */
export const prochaineActionAttenduePar = new Set([
    "Instructeur", 
    "CNPN/CSRPN",
    "Pétitionnaire",
    "Consultation du public",
    "Autre administration",
    "Autre",
    "Personne" 
])
