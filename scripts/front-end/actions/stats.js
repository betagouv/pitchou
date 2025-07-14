//@ts-check

import {json} from 'd3-fetch'

// @ts-ignore
/** @import {StatsPubliques} from '../../types/API_Pitchou.ts' */

/**
 * Charge les statistiques depuis le backend
 * @returns {Promise<StatsPubliques>} Les statistiques calculées
 */
export async function chargerStats() {
    try {
        const stats = await json(`/api/stats-publiques`)
        if (!isStatsPubliques(stats)) {
            throw new Error("Réponse invalide reçue du serveur pour la route /api/stats-publiques.");
        }
       return /** @type {StatsPubliques} */ (stats)
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques :', error)
        throw new Error(`${error}`)
    }
} 

/**
 * Vérifie si l'objet fourni respecte la structure attendue de `StatsPubliques`.
 *
 * Ce type guard permet de s'assurer que toutes les propriétés nécessaires sont présentes
 * et qu'elles sont bien de type `number`. Cela permet de garantir la conformité avec
 * l'interface `StatsPubliques`.
 *
 * Si de nouvelles propriétés sont ajoutées à `StatsPubliques`, pensez à mettre à jour ce type guard.
 *
 * @param {any} stats
 * @returns {stats is StatsPubliques}
 * @see {@link StatsPubliques}
 */
function isStatsPubliques(stats) {
    if (
        stats &&
        typeof stats.nbDossiersEnPhaseContrôle === 'number' &&
        typeof stats.nbDossiersEnPhaseContrôleAvecDécision === 'number' &&
        typeof stats.nbDossiersEnPhaseContrôleSansDécision === 'number' &&
        typeof stats.nbPétitionnairesDepuisSept2024 === 'number' &&
        typeof stats.totalContrôles === 'number' &&
        typeof stats.totalDossiers === 'number'
    ) {
        /** 
         * Création d'un objet conforme à `StatsPubliques` uniquement à des fins de vérification statique.
         * 
         * @type {StatsPubliques}
         * Cette variable n'est utilisée que pour forcer une erreur TypeScript
         * si une propriété est ajoutée à `StatsPubliques` sans mettre à jour ce type guard.
         */
        let statsOk = {
            nbDossiersEnPhaseContrôle: stats.nbDossiersEnPhaseContrôle,
            nbDossiersEnPhaseContrôleAvecDécision: stats.nbDossiersEnPhaseContrôleAvecDécision,
            nbDossiersEnPhaseContrôleSansDécision: stats.nbDossiersEnPhaseContrôleSansDécision, 
            nbPétitionnairesDepuisSept2024: stats.nbPétitionnairesDepuisSept2024,
            totalContrôles: stats.totalContrôles,
            totalDossiers: stats.totalDossiers
        };
        statsOk // pour éviter une erreur typescript que la variable n'est pas utilisée
        return true;
    }
    return false;
}
