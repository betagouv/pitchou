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
            throw new Error(`Réponse invalide reçue du serveur pour la route /api/stats-publiques. Réponse reçue : ${JSON.stringify(stats)}` );
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
 */
function isStatsPubliques(stats) {
    console.log({ stats })
    if (
        Object(stats) === stats  &&
        typeof stats.nbDossiersEnPhaseContrôle === 'number' &&
        typeof stats.nbDossiersEnPhaseContrôleAvecDécision === 'number' &&
        typeof stats.nbDossiersEnPhaseContrôleSansDécision === 'number' &&
        typeof stats.nbPétitionnairesDepuisSept2024 === 'number' &&
        typeof stats.totalDossiers === 'number' &&
        typeof stats.totalPrescriptions === 'number' &&
        typeof stats.nbPrescriptionsControlees === 'number' &&
        Object(stats.statsConformité) === stats.statsConformité &&
        typeof stats.statsConformité.nb_non_conforme === 'number' &&
        typeof stats.statsConformité.nb_trop_tard === 'number' &&
        typeof stats.statsConformité.nb_conforme_apres_1 === 'number' &&
        typeof stats.statsConformité.nb_conforme_apres_2 === 'number' &&
        typeof stats.statsConformité.nb_conforme_apres_3 === 'number' &&
        typeof stats.statsConformité.nb_retour_conformite === 'number'
        && (
            typeof stats.statsImpactBiodiversité === 'object' && stats.statsImpactBiodiversité !== null &&
            typeof stats.statsImpactBiodiversité.total_prescriptions_conformes === 'number' &&
            typeof stats.statsImpactBiodiversité.total_surface_évitée === 'number' &&
            typeof stats.statsImpactBiodiversité.total_surface_compensée === 'number' &&
            typeof stats.statsImpactBiodiversité.total_nids_évités === 'number' &&
            typeof stats.statsImpactBiodiversité.total_nids_compensés === 'number' &&
            typeof stats.statsImpactBiodiversité.total_individus_évités === 'number' &&
            typeof stats.statsImpactBiodiversité.total_individus_compensés === 'number'
        )
    ) {
        /**
         * Création d'un objet conforme à `StatsPubliques` uniquement à des fins de vérification statique.
         * 
         * @type {Required<StatsPubliques>}
         * Cette variable n'est utilisée que pour forcer une erreur TypeScript
         * si une propriété est ajoutée à `StatsPubliques` sans mettre à jour ce type guard.
         */
        let statsOk = {
            nbDossiersEnPhaseContrôle: 0,
            nbDossiersEnPhaseContrôleAvecDécision: 0,
            nbDossiersEnPhaseContrôleSansDécision: 0, 
            nbPétitionnairesDepuisSept2024: 0,
            totalDossiers: 0,
            totalPrescriptions: 0,
            nbPrescriptionsControlees: 0,
            statsConformité:{
                nb_conforme_apres_1: 0,
                nb_conforme_apres_2: 0,
                nb_conforme_apres_3: 0,
                nb_non_conforme: 0,
                nb_retour_conformite: 0,
                nb_trop_tard: 0
            },
            statsImpactBiodiversité:{
                total_individus_compensés: 0,
                total_individus_évités: 0,
                total_nids_compensés: 0,
                total_nids_évités: 0,
                total_prescriptions_conformes: 0,
                total_surface_compensée: 0,
                total_surface_évitée: 0
            }
        };
        void statsOk // pour éviter une erreur typescript que la variable n'est pas utilisée

        return true;
    }
    return false;
}