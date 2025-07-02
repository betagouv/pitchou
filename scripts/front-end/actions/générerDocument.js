import {format} from 'date-fns'
import {fr} from 'date-fns/locale';

import {formatLocalisation, formatPorteurDeProjet} from '../affichageDossier.js' 
import {créerEspècesGroupéesParImpact} from './créerEspècesGroupéesParImpact.js'

//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {BalisesGénérationDocument} from '../../types/balisesGénérationDocument.ts' */
//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {DescriptionMenacesEspèces} from '../../types/especes.d.ts' */
//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {DossierComplet} from '../../types/API_Pitchou.d.ts' */

/**
 * @param {DossierComplet} dossier
 * @param {DescriptionMenacesEspèces | undefined} espècesImpactées Description des espèces impactées par le dossier
 * @returns {Promise<BalisesGénérationDocument>} Liste des balises fournies aux instructeur.i.ces
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export async function getBalisesGénérationDocument(dossier, espècesImpactées) {
    const functions = {
        afficher_nombre,
        formatter_date,
        formatter_date_simple
    }

    const {
    nom,
    commentaire_enjeu,
    date_consultation_public,
    description,
    enjeu_écologique,
    enjeu_politique,
    justification_absence_autre_solution_satisfaisante,
    mesures_erc_prévues,
    motif_dérogation,
    justification_motif_dérogation,
    date_début_intervention,
    date_fin_intervention,
    durée_intervention,
    historique_identifiant_demande_onagre,
    activité_principale,
    rattaché_au_régime_ae,
    scientifique_type_demande,
    scientifique_description_protocole_suivi,
    scientifique_mode_capture,
    scientifique_modalités_source_lumineuses,
    scientifique_modalités_marquage,
    scientifique_modalités_transport,
    scientifique_périmètre_intervention,
    scientifique_intervenants,
    scientifique_précisions_autres_intervenants
    } = dossier

    // Transformer les espèces impactées si elles existent
    let espèces_impacts = undefined
    if (espècesImpactées) {
        try {
            espèces_impacts = await créerEspècesGroupéesParImpact(espècesImpactées)
        } catch (e) {
            console.error('Erreur lors de la transformation des espèces impactées:', e)
        }
    }

    return {
        nom,
        commentaires_DREAL: commentaire_enjeu?.trim() ?? '',
        date_début_consultation_public: date_consultation_public,
        description,
        enjeu_écologique: !!enjeu_écologique,
        enjeu_politique: !!enjeu_politique,
        justification_absence_autre_solution_satisfaisante,
        mesures_erc_prévues: !!mesures_erc_prévues,
        motif_dérogation,
        justification_motif_dérogation,
        identifiant_onagre: historique_identifiant_demande_onagre,
        activité_principale,
        date_début_intervention,
        date_fin_intervention,
        durée_intervention,
        demandeur: formatPorteurDeProjet(dossier),
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
        ...functions
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