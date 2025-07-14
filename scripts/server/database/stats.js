import {créerTransaction} from '../database.js'
import {getPrescriptions} from './prescription.js'
import {getContrôles} from './controle.js'


//@ts-ignore
/** @import {StatsPubliques} from '../../types/API_Pitchou.ts' */

/**
 * Calcule les statistiques publiques de Pitchou
 * @returns {Promise<StatsPubliques>}
 */
export async function getStatsPubliques() {
    const transaction = await créerTransaction({ readOnly: true })

    // Récupérer tous les dossiers (stats publiques)
    const dossiers = await transaction('dossier')
        .select([
            'dossier.id',
            'dossier.date_dépôt',
            'dossier.rattaché_au_régime_ae',
            'dossier.déposant',
            'personne.email as déposant_email'
        ])
        .leftJoin('personne', {'personne.id': 'dossier.déposant'})

    // Récupérer les phases actuelles des dossiers
    const phasesDossiers = await transaction('évènement_phase_dossier')
        .select([
            'évènement_phase_dossier.dossier',
            'évènement_phase_dossier.phase',
            'évènement_phase_dossier.horodatage'
        ])
        .whereIn('évènement_phase_dossier.dossier', dossiers.map(d => d.id))
        .orderBy(['évènement_phase_dossier.dossier', 'évènement_phase_dossier.horodatage'])

    // Récupérer toutes les décisions administratives
    const décisionsAdministratives = await transaction('décision_administrative')
        .select([
            'décision_administrative.dossier',
            'décision_administrative.id',
            'décision_administrative.date_signature'
        ])

    // Récupérer toutes les prescriptions
    const prescriptions = await getPrescriptions(décisionsAdministratives.map((/** @type {any} */ d) => d.id))

    // Récupérer tous les contrôles
    const contrôles = await getContrôles(prescriptions.map((/** @type {any} */ p) => p.id))

    // Organiser les données
    const phasesParDossier = new Map()
    for (const phase of phasesDossiers) {
        if (!phasesParDossier.has(phase.dossier)) {
            phasesParDossier.set(phase.dossier, [])
        }
        phasesParDossier.get(phase.dossier).push(phase)
    }

    const décisionsParDossier = new Map()
    for (const décision of décisionsAdministratives) {
        if (!décisionsParDossier.has(décision.dossier)) {
            décisionsParDossier.set(décision.dossier, [])
        }
        décisionsParDossier.get(décision.dossier).push(décision)
    }

    const prescriptionsParDécision = new Map()
    for (const prescription of prescriptions) {
        if (!prescriptionsParDécision.has(prescription.décision_administrative)) {
            prescriptionsParDécision.set(prescription.décision_administrative, [])
        }
        prescriptionsParDécision.get(prescription.décision_administrative).push(prescription)
    }

    const contrôlesParPrescription = new Map()
    for (const contrôle of contrôles) {
        if (!contrôlesParPrescription.has(contrôle.prescription)) {
            contrôlesParPrescription.set(contrôle.prescription, [])
        }
        contrôlesParPrescription.get(contrôle.prescription).push(contrôle)
    }

    // Calculer les statistiques
    const dateLimite = new Date('2024-09-01')

    let stats = {
        totalDossiers: dossiers.length,
        dossiersEnPhaseContrôle: 0,
        dossiersEnPhaseContrôleAvecDécision: 0,
        dossiersEnPhaseContrôleSansDécision: 0,
        décisionsAvecPrescriptions: 0,
        décisionsSansPrescriptions: 0,
        totalDécisions: 0,
        totalContrôles: 0,
        nbPetitionnairesDepuisSept2024: 0,
        nbDossiersDepuisSept2024: 0,
        nbDossiersAEDepuisSept2024: 0,
        emailsPetitionnairesDepuisSept2024: new Set()
    }

    for (const dossier of dossiers) {
        // Phase actuelle du dossier
        const phases = phasesParDossier.get(dossier.id) || []
        const phaseActuelle = phases.length > 0 ? phases[phases.length - 1].phase : null

        // Décisions du dossier
        const décisions = décisionsParDossier.get(dossier.id) || []

        // Statistiques depuis septembre 2024
        if (dossier.date_dépôt && new Date(dossier.date_dépôt) >= dateLimite) {
            stats.nbDossiersDepuisSept2024++
            
            if (dossier.rattaché_au_régime_ae) {
                stats.nbDossiersAEDepuisSept2024++
            }

            if (dossier.déposant_email) {
                stats.emailsPetitionnairesDepuisSept2024.add(dossier.déposant_email)
            }
        }

        // Statistiques des phases
        if (phaseActuelle === 'Contrôle') {
            stats.dossiersEnPhaseContrôle++
            
            if (décisions.length > 0) {
                stats.dossiersEnPhaseContrôleAvecDécision++
            } else {
                stats.dossiersEnPhaseContrôleSansDécision++
            }
        }

        // Statistiques des décisions et prescriptions
        stats.totalDécisions += décisions.length

        for (const décision of décisions) {
            const prescriptionsDécision = prescriptionsParDécision.get(décision.id) || []
            
            if (prescriptionsDécision.length > 0) {
                stats.décisionsAvecPrescriptions++
            } else {
                stats.décisionsSansPrescriptions++
            }

            // Compter les contrôles pour les dossiers en phase Contrôle ou Obligations terminées
            if (phaseActuelle === 'Contrôle' || phaseActuelle === 'Obligations terminées') {
                for (const prescription of prescriptionsDécision) {
                    const contrôlesPrescription = contrôlesParPrescription.get(prescription.id) || []
                    stats.totalContrôles += contrôlesPrescription.length
                }
            }
        }
    }

    stats.nbPetitionnairesDepuisSept2024 = stats.emailsPetitionnairesDepuisSept2024.size
    // Pas besoin de renvoyer les emails dans la réponse
    const { emailsPetitionnairesDepuisSept2024, ...statsFinales } = stats

    return statsFinales
} 