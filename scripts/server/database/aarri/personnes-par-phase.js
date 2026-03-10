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
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} Une liste des personnes acquises et la date à laquelle elles ont été acquises.
*/
export async function getPersonnesAcquisesAvecSemaine() {
    /** @type {[ÉvènementMétrique['type']]} */
    const évènements = ['seConnecter']
    const nombreSeuil = 1

    return getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}


/**
 * Retourne les personnes actives et la date à laquelle elles ont été considérées comme actives.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 *
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} Une liste des personnes actives et la date à laquelle elles ont été activées.
*/
export async function getPersonnesActivesAvecSemaine() {
    const évènements = ÉVÈNEMENTS_MODIFICATIONS
    const nombreSeuil = 5
    
    return await getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil)
}

/**
 * Retourne les personnes dans la phae Impact et la date à laquelle elles ont été considérées dans la phase Impact.
 * L'impact de Pitchou est mesuré par les retours à conformité
 * 
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>} Une liste des personnes dans la phase Impact et la date à laquelle elles ont été considérées dans la phase Impact.
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