//@ts-check

import { differenceInDays, format, formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

/** @import {DossierComplet} from '../types.js'*/

/**
 * @param {Partial<DossierComplet>} localisation
 * @returns {string} 
 */
export function formatLocalisation({communes, départements, régions}){
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
 * @param {Partial<DossierComplet>} déposant
 * @returns {string} 
 */
export function formatDéposant({déposant_nom, déposant_prénoms}){
    if(!déposant_nom){
        déposant_nom = ''
    }
    if(!déposant_prénoms){
        déposant_prénoms = ''
    }

    return déposant_nom ? déposant_nom + ' ' + déposant_prénoms : déposant_prénoms
}

/**
 * @param {Partial<DossierComplet>} demandeur
 * @returns {string} 
 */
export function formatDemandeur({demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret}){
    if(demandeur_personne_physique_nom){
        return demandeur_personne_physique_nom + ' ' + demandeur_personne_physique_prénoms
    }
    else{
        if(demandeur_personne_morale_siret){
            return `${demandeur_personne_morale_raison_sociale} (${demandeur_personne_morale_siret})`
        }
        else
            return '(inconnu)'
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

export const phases = [
    "accompagnement amont",
    "accompagnement amont terminé", 
    "instruction",
    "décision",
    "refus tacite",
]

export const prochaineActionAttenduePar = [
    "instructeur",
    "CNPN/CSRPN",
    "pétitionnaire",
    "consultation du public",
    "autre administration",
    "sans objet",
]

export const prochaineActionAttendue = [
    "traitement", 
    "lancement consultation", 
    "rédaction AP",
    "Avis",
    "DDEP",
    "complément dossier",
    "mémoire en réponse avis CNPN",
]