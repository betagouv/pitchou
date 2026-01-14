/** @import { IndicateursAARRI } from '../../types/API_Pitchou.ts' */
/**  @import { ÉvènementMétrique } from '../../types/évènement' */

import { json } from 'd3-fetch'
import { isValidDate } from '../../commun/typeFormat.js';
import store from '../store.js'


/**
 * Charge les indicateurs AARRI depuis le backend
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function chargerIndicateursAARRI() {
    try {
        const indicateursParDate = await json(`/api/aarri`).then(
            (result) => {
                if (!Array.isArray(result)) {
                    throw new Error(`Réponse invalide reçue du serveur pour la route /api/aarri : le résultat n'est pas un array`)
                }
                return result.map((indicateurs) => ({...indicateurs, date: new Date(indicateurs.date)}))
            }
            )
        if (!isIndicateursAARRIParDate(indicateursParDate)) {
            throw new Error(`Réponse invalide reçue du serveur pour la route /api/aarri. Réponse reçue : ${JSON.stringify(indicateursParDate)}` );
        }
       return indicateursParDate
    } catch (error) {
        console.error('Erreur lors du chargement des indicateurs AARRI :', error)
        throw new Error(`${error}`)
    }
}

/**
 * @param {any} indicateursParDate
 * @returns {indicateursParDate is IndicateursAARRI[]}
 */
function isIndicateursAARRIParDate(indicateursParDate) {
    if (!Array.isArray(indicateursParDate)) {
        return false
    }

    return indicateursParDate.every(isIndicateursAARRI)
}

/**
 * @param {any} indicateurs
 * @returns {indicateurs is IndicateursAARRI}
 */
function isIndicateursAARRI(indicateurs) {
    if (
        Object(indicateurs) === indicateurs  &&
        typeof indicateurs.nombreBaseUtilisateuricePotentielle === 'number' && indicateurs.nombreBaseUtilisateuricePotentielle!==0  &&
        typeof indicateurs.nombreUtilisateuriceAcquis === 'number'&&
        typeof indicateurs.nombreUtilisateuriceActif === 'number'&&
        typeof indicateurs.nombreUtilisateuriceRetenu === 'number'&&
        typeof indicateurs.nombreUtilisateuriceImpact === 'number' &&
        isValidDate(indicateurs.date)
    ) {
        return true;
    }
    return false;
}

/**
 * @param {ÉvènementMétrique} évènement
 */
export function envoyerÉvènement(évènement) {
    if (store.state.capabilities.créerÉvènementMetrique) {
        store.state.capabilities.créerÉvènementMetrique(évènement)
            .catch(e => console.warn(`Échec lors de la création de l’évènement: ${e}`))
    }
}
