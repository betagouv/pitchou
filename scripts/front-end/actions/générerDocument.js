import {format} from 'date-fns'
import {fr} from 'date-fns/locale';

import {formatLocalisation, formatPorteurDeProjet} from '../affichageDossier.js'

//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {EspècesParActivité} from './créerEspècesGroupéesParImpact.js' */
//@ts-expect-error TS ne comprend pas que ces imports sont utilisés
/** @import {DossierComplet} from '../../types/API_Pitchou.d.ts' */

/**
 * @typedef {Object} BalisesGénérationDocument
 * @prop {string | null} nom
 * @prop {string | null} description
 * @prop {string | null} justification_absence_autre_solution_satisfaisante
 * @prop {string | null} motif_dérogation
 * @prop {string | null} justification_motif_dérogation
 * @prop {string | null} identifiant_onagre
 * @prop {string | null} activité_principale
 * @prop {Date | null} date_début_intervention
 * @prop {Date | null} date_fin_intervention
 * @prop {number | null} durée_intervention
 * @prop {string} demandeur
 * @prop {string} localisation
 * @prop {boolean} régime_autorisation_environnementale_renseigné
 * @prop {string | boolean} régime_autorisation_environnementale
 * @prop {Array<{liste_espèces: Array<{nomVernaculaire: string, nomScientifique: string, liste_impacts_quantifiés: string[]}>, impact: string, liste_noms_impacts_quantifiés: string[]}> | undefined} liste_espèces_par_impact
 * @prop {{type_demande: string[] | null, description_protocole_suivi: string | null, mode_capture: string[] | null, modalités_source_lumineuses: string | null, modalités_marquage: string | null, modalités_transport: string | null, périmètre_intervention: string | null, intervenants: unknown | null, précisions_autres_intervenants: string | null}} scientifique
 * @prop {number} identifiant_pitchou
 * @prop {(n: any, precision?: number) => string | undefined} afficher_nombre
 * @prop {(date: any, formatString: string) => string | undefined} formatter_date
 * @prop {(date: any) => string | undefined} formatter_date_simple
 */

/**
 * @param {DossierComplet} dossier
 * @param {EspècesParActivité[]| undefined} espèces_impacts Liste des espèces concernées par le dossier 
 * regroupées par activité
 * @returns {BalisesGénérationDocument} Liste des balises fournies aux instructeur.i.ces
 * @remark Attention, modifier le type de retour de cette fonction peut casser le rendu des documents existants.
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export function getBalisesGénérationDocument(dossier,espèces_impacts) {
    const functions = {
        afficher_nombre,
        formatter_date,
        formatter_date_simple
    }

    const {
    nom,
    description,
    justification_absence_autre_solution_satisfaisante,
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


    return {
        nom,
        description,
        justification_absence_autre_solution_satisfaisante,
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
        régime_autorisation_environnementale: rattaché_au_régime_ae===null ? 'Non renseigné':rattaché_au_régime_ae,
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