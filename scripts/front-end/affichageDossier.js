//@ts-check

import { differenceInDays, format, formatRelative } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatLocalisation({communes, départements, régions}){
    if(!communes && !départements && régions){
        return `Régions: ${régions.join(', ')}`
    }

    if(!communes && départements){
        return départements.join(', ')
    }

    if((!communes && !départements) || (communes.length === 0 && départements.length === 0)){
        return '(inconnue)'
    }

    return communes.map(({name}) => name).join(', ') + ' ' + `(${départements.join(', ')})`
}

export function formatDéposant({déposant_nom, déposant_prénoms}){
    if(!déposant_nom){
        déposant_nom = ''
    }
    if(!déposant_prénoms){
        déposant_prénoms = ''
    }

    return déposant_nom ? déposant_nom + ' ' + déposant_prénoms : déposant_prénoms
}

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
 * @param {Date} date
 * @returns {string}
 */
export function formatDateAbsolue(date) {
    return format(date, 'd MMMM yyyy', { locale: fr })
}
  
  /**
   *
   * @param {Date} date
   * @returns {string}
   */
export function formatDateRelative(date) {
    if (differenceInDays(date, new Date()) === 0) {
      return `Aujourd'hui`
    }
    if (Math.abs(differenceInDays(date, new Date())) <= 7) {
      return formatRelative(date, new Date(), {locale: fr })
    }
  
    return formatDateAbsolue(date)
}