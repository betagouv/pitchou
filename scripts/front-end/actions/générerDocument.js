//@ts-check


/** @import { CodeActivitéPitchou, CodeActivitéStandard, ActivitéMenançante, DescriptionMenacesEspèces, DonnéesSecondaires  } from '../../types/especes.ts' */
/** @import { BalisesGénérationDocument } from '../../types/balisesGénérationDocument.ts' */
/** @import { DossierComplet } from '../../types/API_Pitchou.ts' */
/** @import { EspècesParActivité } from './créerEspècesGroupéesParImpact.js' */

import {format} from 'date-fns'
import {fr} from 'date-fns/locale';

import {formatLocalisation, formatPorteurDeProjet} from '../affichageDossier.js'
import {créerEspècesGroupéesParImpact} from './créerEspècesGroupéesParImpact.js'


/**
 * @param {DossierComplet} dossier
 * @param {DescriptionMenacesEspèces} espècesImpactées Description des espèces impactées par le dossier
 * @param {Map<ActivitéMenançante['Identifiant Pitchou'], DonnéesSecondaires[]>} activitéVersDonnéesSecondaires
 * @returns {BalisesGénérationDocument} Liste des balises fournies aux instructeur.i.ces
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export function getBalisesGénérationDocument(dossier, espècesImpactées, activitéVersDonnéesSecondaires) {
    const functions = {
        afficher_nombre,
        formatter_date,
        formatter_date_simple
    }

    const {
        nom,
        commentaire_libre,
        date_consultation_public,
        description,
        date_dépôt,
        départements,
        enjeu_écologique,
        enjeu_politique,
        justification_absence_autre_solution_satisfaisante,
        mesures_erc_prévues,
        motif_dérogation,
        nombre_nids_compensés_dossier_oiseau_simple,
        nombre_nids_détruits_dossier_oiseau_simple,
        justification_motif_dérogation,
        date_début_intervention,
        date_fin_intervention,
        durée_intervention,
        historique_identifiant_demande_onagre,
        activité_principale,
        rattaché_au_régime_ae,
        type,
        scientifique_type_demande,
        scientifique_bilan_antérieur,
        scientifique_finalité_demande,
        scientifique_description_protocole_suivi,
        scientifique_mode_capture,
        scientifique_modalités_source_lumineuses,
        scientifique_modalités_marquage,
        scientifique_modalités_transport,
        scientifique_périmètre_intervention,
        scientifique_intervenants,
        scientifique_précisions_autres_intervenants
    } = dossier

    /** @type {EspècesParActivité[] | undefined} */
    // Transformer les espèces impactées si elles existent
    const espèces_impacts = créerEspècesGroupéesParImpact(espècesImpactées, activitéVersDonnéesSecondaires)

    /** @type {BalisesGénérationDocument['hirondelles']} */
    const hirondelles = type === 'Hirondelle' ? {
        nids_détruits: nombre_nids_détruits_dossier_oiseau_simple ?? null,
        nids_compensés: nombre_nids_compensés_dossier_oiseau_simple ?? null,
    } : undefined

    /** @type {BalisesGénérationDocument['cigognes']} */
    const cigognes = type === 'Cigogne' ? {
        nids_détruits: nombre_nids_détruits_dossier_oiseau_simple ?? null,
        nids_compensés: nombre_nids_compensés_dossier_oiseau_simple ?? null,
    } : undefined;

    return {
        nom,
        commentaire_instruction: commentaire_libre?.trim() ?? '',
        date_début_consultation_public: date_consultation_public,
        description,
        date_dépôt,
        département_principal: Array.isArray(départements) ? départements[0] : undefined,
        liste_départements: départements || undefined,
        enjeu_écologique: !!enjeu_écologique,
        enjeu_politique: !!enjeu_politique,
        justification_absence_autre_solution_satisfaisante,
        mesures_erc_prévues: mesures_erc_prévues===null ? 'Non renseigné' : mesures_erc_prévues,
        mesures_erc_prévues_renseigné: mesures_erc_prévues !== null,
        motif_dérogation,
        hirondelles,
        cigognes,
        justification_motif_dérogation,
        identifiant_onagre: historique_identifiant_demande_onagre,
        activité_principale,
        date_début_intervention,
        date_fin_intervention,
        durée_intervention,
        demandeur: {
            adresse: dossier.demandeur_adresse,
            nom: dossier.demandeur_personne_morale_raison_sociale || `${dossier.demandeur_personne_physique_prénoms} ${dossier.demandeur_personne_physique_nom}`,
            toString(){
                return formatPorteurDeProjet(dossier)
            }
        },
        localisation: formatLocalisation(dossier),
        régime_autorisation_environnementale_renseigné: rattaché_au_régime_ae !== null,
        régime_autorisation_environnementale: rattaché_au_régime_ae===null ? 'Non renseigné' : rattaché_au_régime_ae,
        liste_espèces_par_impact: espèces_impacts?.map(({espèces,activité,impactsQuantifiés}) => ({
            liste_espèces: espèces.map(({nomVernaculaire,nomScientifique, détails}) => ({
                nomVernaculaire,
                nomScientifique,
                liste_impacts_quantifiés:détails,
            })),
            impact: activité,
            liste_noms_impacts_quantifiés: impactsQuantifiés,
        }) ),
        scientifique: {
            type_demande: scientifique_type_demande,
            bilan_antérieur: scientifique_bilan_antérieur,
            // @ts-expect-error colonne json, donc la génération de types comprend mal
            finalité_demande: scientifique_finalité_demande,
            description_protocole_suivi: scientifique_description_protocole_suivi,
            mode_capture: scientifique_mode_capture,
            modalités_source_lumineuses: scientifique_modalités_source_lumineuses,
            modalités_marquage: scientifique_modalités_marquage,
            modalités_transport: scientifique_modalités_transport,
            périmètre_intervention: scientifique_périmètre_intervention,
            intervenants: scientifique_intervenants,
            précisions_autres_intervenants: scientifique_précisions_autres_intervenants,
        },
        identifiant_pitchou: dossier.id,
        ...functions,
    }
}

/**
 *
 * @param {any} n
 * @param {number} precision
 * @returns {string | undefined}
 */
function afficher_nombre(n, precision = 2){
    if(typeof n === 'string'){
        n = parseFloat(n)
    }

    if(typeof n === 'number'){
        if(Number.isNaN(n)){
            return '(erreur de calcul)'
        }

        if(Number.isInteger(n))
            return n.toString(10)
        else{
            return n.toFixed(precision)
        }
    }

    return undefined
}

/**
 *
 * @param {any} date
 * @param {string} formatString
 * @returns {string | undefined}
 */
function formatter_date(date, formatString){
    if(!date)
        return undefined
    date = new Date(date)
    return format(date, formatString, { locale: fr })
}


/**
 *
 * @param {any} date
 * @returns {string | undefined}
 */
function formatter_date_simple(date){
    return formatter_date(date, 'd MMMM yyyy')
}
