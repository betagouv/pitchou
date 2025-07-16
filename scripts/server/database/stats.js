import knex from 'knex';
import {créerTransaction} from '../database.js'
import { formatISO, startOfToday } from 'date-fns';

//@ts-ignore
/** @import {StatsPubliques, StatsConformité, StatsImpactBiodiversité} from '../../types/API_Pitchou.ts' */

/**
 * Calcule les statistiques publiques de Pitchou
 * @returns {Promise<StatsPubliques>}
 */
export async function getStatsPubliques() {
    const transaction = await créerTransaction({ readOnly: true })
    const aujourdhui = formatISO(startOfToday())
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


        const pétitionnairesDepuisSept2024P = transaction('dossier')
        .select(['demandeur_personne_morale', 'demandeur_personne_physique'])
        .where('date_dépôt', '<=', '2024-09-30')
        .groupBy('demandeur_personne_morale', 'demandeur_personne_physique');


        /** Les prescriptions qui nous intéressent sont les prescriptions contrôlables, i.e. les prescriptions dont la date d'échéance est dans le passé */
        const prescriptionsP = transaction('prescription')
          .select([
            'id',
            'surface_évitée',
            'surface_compensée',
            'nids_évités',
            'nids_compensés',
            'individus_évités',
            'individus_compensés',
          ])
          .where('date_échéance', '<=', aujourdhui)
          .as('p'); // 

        const contrôleP = transaction
          .select([
            'contrôle.prescription',
            'contrôle.résultat',
            'contrôle.date_contrôle',
          ])
          .from('contrôle')
          .join(prescriptionsP, 'contrôle.prescription', 'p.id').as('c'); 


        const prescriptionsControleesP = transaction.from(contrôleP).countDistinct('prescription as nb').first();

        const statsImpactBiodiversitéP = getStatsImpactBiodiversité(transaction);

        const statsConformitéP = getStatsConformité(transaction, contrôleP)

        const [dossiers, dossiersEnPhaseContrôle, pétitionnairesDepuisSept2024, statsConformité, prescriptions, prescriptionsControleesRow, statsImpactBiodiversité] = await Promise.all([
            dossiersP,
            dossiersEnPhaseContrôleP,
            pétitionnairesDepuisSept2024P,
            statsConformitéP,
            prescriptionsP,
            prescriptionsControleesP,
            statsImpactBiodiversitéP
        ]);

        const totalPrescriptions = prescriptions.length
        const nbPrescriptionsControlees = Number(prescriptionsControleesRow?.nb);
    

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
            nbPétitionnairesDepuisSept2024: pétitionnairesDepuisSept2024.length,
            totalPrescriptions,
            nbPrescriptionsControlees,
            statsConformité,
            statsImpactBiodiversité
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
 * @param {knex.Knex.QueryBuilder} contrôleP
 * @returns {Promise<StatsConformité>}
 */
async function getStatsConformité(transaction, contrôleP) {
  const nbControles = transaction
    .from(contrôleP.as('contrôle'))
    .select('prescription')
    .count('* as nb_contrôles')
    .groupBy('prescription');

  const dernierControle = transaction
    .from(contrôleP.as('contrôle'))
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
    nb_retour_conformite: Number(résultatsRequêteSQL['nb_retour_conformite']),
  }

  return stats;
}

/**
 * Récupère les statistiques d'impact biodiversité pour les prescriptions ayant au moins un contrôle conforme.
 * @param {knex.Knex.Transaction | knex.Knex} transaction
 * @returns {Promise<StatsImpactBiodiversité>}
 */
async function getStatsImpactBiodiversité(transaction) {
  const sousRequête = transaction('prescription')
    .join('contrôle', 'prescription.id', 'contrôle.prescription')
    .where('contrôle.résultat', 'Conforme')
    .distinctOn('prescription.id')
    .select(
      'prescription.id',
      'prescription.surface_évitée',
      'prescription.surface_compensée',
      'prescription.nids_évités',
      'prescription.nids_compensés',
      'prescription.individus_évités',
      'prescription.individus_compensés'
    )
    .orderBy([
      { column: 'prescription.id', order: 'asc' },
      { column: 'contrôle.date_contrôle', order: 'desc' },
    ]);

  const résultat = await transaction
    .from(sousRequête.as('prescriptions_conformes'))
    .select([
      transaction.raw('COUNT(*)::int AS total_prescriptions_conformes'),
      transaction.raw('SUM(COALESCE(surface_évitée, 0))::float AS total_surface_évitée'),
      transaction.raw('SUM(COALESCE(surface_compensée, 0))::float AS total_surface_compensée'),
      transaction.raw('SUM(COALESCE(nids_évités, 0))::int AS total_nids_évités'),
      transaction.raw('SUM(COALESCE(nids_compensés, 0))::int AS total_nids_compensés'),
      transaction.raw('SUM(COALESCE(individus_évités, 0))::int AS total_individus_évités'),
      transaction.raw('SUM(COALESCE(individus_compensés, 0))::int AS total_individus_compensés'),
    ])
    .first();

  /** @type StatsImpactBiodiversité */
  const stats = {
    total_prescriptions_conformes: Number(résultat.total_prescriptions_conformes),
    total_surface_évitée: Number(résultat.total_surface_évitée),
    total_surface_compensée: Number(résultat.total_surface_compensée),
    total_nids_évités: Number(résultat.total_nids_évités),
    total_nids_compensés: Number(résultat.total_nids_compensés),
    total_individus_évités: Number(résultat.total_individus_évités),
    total_individus_compensés: Number(résultat.total_individus_compensés),
  };

  return stats;
}
