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
        // Récupérer tous les dossiers
        const dossiersP = transaction('dossier')
            .select('id')

        // Récupérer les dossiers actuellement en phase contrôle
        const dossiersEnPhaseContrôleP = transaction('évènement_phase_dossier')
            .select('dossier')
            .max('horodatage as latest_horodatage')
            .where('phase', 'Contrôle')
            .groupBy('dossier')
            .orderBy('latest_horodatage', 'desc');

        const contrôlesP = transaction('contrôle').select('id')

        const pétitionnairesDepuisSept2024P = transaction('dossier')
        .select(['demandeur_personne_morale', 'demandeur_personne_physique'])
        .where('date_dépôt', '<=', '2024-09-30')
        .groupBy('demandeur_personne_morale', 'demandeur_personne_physique');


        const [dossiers, dossiersEnPhaseContrôle, contrôles,pétitionnairesDepuisSept2024] = await Promise.all([
            dossiersP,
            dossiersEnPhaseContrôleP,
            contrôlesP,
            pétitionnairesDepuisSept2024P,
        ]);

        const dossiersIdsEnPhaseContrôle = dossiersEnPhaseContrôle.map(row => row.dossier);

        // Récupérer les décisions administratives pour les dossiers en phase Contrôle
        const décisionsPourDossierEnPhaseContrôle = await transaction('évènement_phase_dossier as epd')
            .join('décision_administrative as da', 'da.dossier', 'epd.dossier')
            .whereIn('epd.dossier', dossiersIdsEnPhaseContrôle)
            .whereNotNull('da.type')
            .distinct('epd.dossier')
            .select('epd.dossier');

        /** @type {StatsPubliques} */   
        let stats = {
            totalDossiers: dossiers.length,
            nbDossiersEnPhaseContrôle: dossiersEnPhaseContrôle.length,
            nbDossiersEnPhaseContrôleAvecDécision: décisionsPourDossierEnPhaseContrôle.length,
            nbDossiersEnPhaseContrôleSansDécision: dossiersEnPhaseContrôle.length - décisionsPourDossierEnPhaseContrôle.length,
            totalContrôles: contrôles.length,
            nbPétitionnairesDepuisSept2024: pétitionnairesDepuisSept2024.length,
        }

        await transaction.commit()
        return stats
    } catch (e) {
        await transaction.rollback()
        throw e
    }
} 