//@ts-check

import {json} from 'd3-fetch'


// @ts-ignore
/** @import {StatsPubliques} from '../../types/API_Pitchou.ts' */

/**
 * Charge les statistiques depuis le backend
 * @returns {Promise<StatsPubliques>} Les statistiques calculées
 */
export async function chargerStats() {
    console.log('dans chargerStats')
    try {
        const stats = await json(`/api/stats-publiques`)

        if (!stats || typeof stats !== 'object') {
            throw new Error('Réponse invalide du serveur')
        }
        return /** @type {StatsPubliques} */ (stats)
    } catch (error) {
        console.error('Erreur lors du chargement des stats:', error)
        // Retourner des stats par défaut en cas d'erreur
        return {
            totalDossiers: 0,
            dossiersEnPhaseContrôle: 0,
            dossiersEnPhaseContrôleAvecDécision: 0,
            dossiersEnPhaseContrôleSansDécision: 0,
            décisionsAvecPrescriptions: 0,
            décisionsSansPrescriptions: 0,
            totalDécisions: 0,
            totalContrôles: 0,
            nbPetitionnairesDepuisSept2024: 0,
            nbDossiersDepuisSept2024: 0,
            nbDossiersAEDepuisSept2024: 0
        }
    }
} 