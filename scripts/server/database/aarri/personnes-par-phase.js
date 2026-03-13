/** @import Personne from '../../../types/database/public/Personne' */
/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */

import { ÉVÈNEMENTS_MODIFICATIONS } from './constantes.js';
import { getPremièreDateAtteinteDuSeuilParPersonne } from './utils.js';

/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */

/**
 * Retourne les personnes acquises et la date à laquelle elles ont été considérées comme acquises.
 * Une personne acquise est une personne qui s'est connectée au moins une fois.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} La liste des personnes acquises et la date à laquelle elles ont été acquises.
*/
export async function getPersonnesAcquisesAvecSemaine() {
    /** @type {[ÉvènementMétrique['type']]} */
    const évènements = ['seConnecter']
    const nombreSeuil = 1

    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}


/**
 * Retourne les personnes activées et la date à laquelle elles ont été considérées comme activées.
 * Une personne activée est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} La liste des personnes activées et la date à laquelle elles ont été activées.
*/
export async function getPersonnesActivesAvecSemaine() {
    const évènements = ÉVÈNEMENTS_MODIFICATIONS
    const nombreSeuil = 5
    
    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}

/**
 * Retourne les personnes dans la phase Impact et la date à laquelle elles sont rentrées dans la phase Impact.
 * L'impact de Pitchou est mesuré par les retours à conformité
 * 
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} La liste des personnes dans la phase Impact et la date à laquelle elles sont rentrées dans la phase Impact.
*/
export async function getPersonnesImpactAvecSemaine() {
    /*
        Avoir de l'impact, c'est de faire au moins un contrôle qui produit un retour à la conformité
        donc un contrôle Conforme qui arrive après un contrôle qui est autre chose que Conforme
    */
    /** @type {ÉvènementMétrique['type'][]} */
    const évènements = [ 'retourÀLaConformité' ]
    const nombreSeuil = 1

    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}