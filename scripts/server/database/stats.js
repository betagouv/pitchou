import knex from 'knex';
import {créerTransaction} from '../database.js'

//@ts-ignore
/** @import {StatsPubliques} from '../../types/API_Pitchou.ts' */
//@ts-ignore
/** @import {StatsConformité} from '../../types/database/public/Stats.ts' */

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

        const statsConformitéP = getStatsConformité(transaction)

        const [dossiers, dossiersEnPhaseContrôle, contrôles,pétitionnairesDepuisSept2024, statsConformité] = await Promise.all([
            dossiersP,
            dossiersEnPhaseContrôleP,
            contrôlesP,
            pétitionnairesDepuisSept2024P,
            statsConformitéP
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
            statsConformité
        }

        await transaction.commit()
        return stats
    } catch (e) {
        await transaction.rollback()
        throw e
    }
} 


/**
 * Récupère les statistiques relatives à la répartition des prescriptions
 * selon la conformité de leur dernier contrôle.
 * @param {knex.Knex.Transaction | knex.Knex} transaction
 * @returns {Promise<StatsConformité>}
 */
async function getStatsConformité(transaction) {
  const nbControles = transaction('contrôle')
    .select('prescription')
    .count('* as nb_contrôles')
    .groupBy('prescription');

  const dernierControle = transaction('contrôle')
    .select('prescription', 'résultat', 'date_contrôle')
    .distinctOn('prescription')
    .orderBy([
      { column: 'prescription', order: 'asc' },
      { column: 'date_contrôle', order: 'desc' },
    ]);


  const résultatsRequêteSQL = await transaction
    .from(dernierControle.as('dc'))
    .join(nbControles.as('nc'), 'dc.prescription', 'nc.prescription') 
    .select([
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Non conforme') AS nb_non_conforme`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Trop tard') AS nb_trop_tard`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat NOT IN ('Conforme', 'Non conforme', 'Trop tard')) AS nb_conformite_autre`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 1) AS nb_conforme_apres_1`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 2) AS nb_conforme_apres_2`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 3) AS nb_conforme_apres_3`
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles > 1) AS nb_retour_conformite`
      )
    ])
    .first();


  /** @type StatsConformité */
  const stats = {
    nb_non_conforme: Number(résultatsRequêteSQL['nb_non_conforme']),
    nb_conforme_apres_1: Number(résultatsRequêteSQL['nb_conforme_apres_1']),
    nb_conforme_apres_2: Number(résultatsRequêteSQL['nb_conforme_apres_2']),
    nb_conforme_apres_3: Number(résultatsRequêteSQL['nb_conforme_apres_3']),
    nb_trop_tard: Number(résultatsRequêteSQL['nb_trop_tard']),
    nb_conformite_autre: Number(résultatsRequêteSQL['nb_conformite_autre']),
    nb_retour_conformite: Number(résultatsRequêteSQL['nb_retour_conformite']),
  }

  return stats;
}
