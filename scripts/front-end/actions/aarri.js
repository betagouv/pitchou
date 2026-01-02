/** @import { IndicateursAARRI } from '../../types/API_Pitchou.ts' */
import { json } from 'd3-fetch'

/**
 * Charge les indicateurs AARRI depuis le backend
 * @returns {Promise<IndicateursAARRI>}
 */
export async function chargerIndicateursAARRI() {
    try {
        const indicateurs = await json(`/api/aarri`)
        if (!isIndicateursAARRI(indicateurs)) {
            throw new Error(`Réponse invalide reçue du serveur pour la route /api/aarri. Réponse reçue : ${JSON.stringify(indicateurs)}` );
        }
       return /** @type {IndicateursAARRI} */ (indicateurs)
    } catch (error) {
        console.error('Erreur lors du chargement des indicateurs AARRI :', error)
        throw new Error(`${error}`)
    }
} 

/**
 * @param {any} indicateurs
 * @returns {indicateurs is IndicateursAARRI}
 */
function isIndicateursAARRI(indicateurs) {
    if (
        Object(indicateurs) === indicateurs  &&
        typeof indicateurs.nbPersonnesAyantRejointGroupeInstructeur === 'number'
    ) {
        return true;
    }
    return false;
}

