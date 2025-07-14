import {créerTransaction} from '../database.js'

//@ts-ignore
/** @import {StatsPubliques} from '../../types/API_Pitchou.ts' */

/**
 * Calcule les statistiques publiques de Pitchou
 * @returns {Promise<StatsPubliques>}
 */
export async function getStatsPubliques() {
    const transaction = await créerTransaction({ readOnly: true })
    try {
        // Récupérer tous les dossiers (stats publiques)
        const dossiers = await transaction('dossier')
            .select('id')

        // Récupérer les dossiers actuellement en phase contrôle
        const dossiersEnPhaseContrôle = await transaction('évènement_phase_dossier')
            .select('dossier')
            .max('horodatage as latest_horodatage')
            .where('phase', 'Contrôle')
            .groupBy('dossier')
            .orderBy('latest_horodatage', 'desc');

        const dossiersIdsEnPhaseContrôle = dossiersEnPhaseContrôle.map(row => row.dossier);

        const décisionsPourDossierEnPhaseContrôle = await transaction('évènement_phase_dossier as epd')
            .join('décision_administrative as da', 'da.dossier', 'epd.dossier')
            .whereIn('epd.dossier', dossiersIdsEnPhaseContrôle)
            .whereNotNull('da.type')
            .distinct('epd.dossier')
            .select('epd.dossier');

        const contrôles = await transaction('contrôle').select('id')

        /** @type {StatsPubliques} */   
        let stats = {
            totalDossiers: dossiers.length,
            nbDossiersEnPhaseContrôle: dossiersEnPhaseContrôle.length,
            nbDossiersEnPhaseContrôleAvecDécision: décisionsPourDossierEnPhaseContrôle.length,
            nbDossiersEnPhaseContrôleSansDécision: dossiersEnPhaseContrôle.length - décisionsPourDossierEnPhaseContrôle.length,
            totalContrôles: contrôles.length,
            nbPétitionnairesDepuisSept2024: 0, // A FAIRE
        }

        await transaction.commit()
        return stats
    } catch (e) {
        await transaction.rollback()
        throw e
    }
} 