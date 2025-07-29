//@ts-check

import { extrairePremierMail, extraireNom, extraireNomDunMail, formaterDépartementDepuisValeur, extraireCommunes, getCommuneData } from "./importDossierUtils";


/** @import { DonnéesSupplémentaires } from "./importDossierUtils" */
/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */

/** @typedef {{
 * "Date de sollicitation": Date;
 * ORIGINE: string;
 * OBJET: string;
 * "N° Dossier DEROG": number;
 * ÉCHÉANCE: string;
 * "POUR\nATTRIBUTION": string;
 * OBSERVATIONS: string;
 * PETITIONNAIRE: string;
 * "Catégorie du demandeur": string;
 * "Nom contact – mail": string;
 * "Année de première sollicitation": number;
 * Communes: string;
 * Département: number | string;
 * Thématique: string;
 * "Procédure associée": string;
 * "Etapes du projet": string;
 * "Stade de l’avis": string;
 * "Description avancement dossier avec dates": string;
 * "Avis SBEP": string;
 * "Date de rendu de l’avis/envoi réponse": Date;
 * "Sollicitation OFB pour avis": string;
 * DEP: string;
 * "Date de dépôt DEP": string;
 * "Saisine CSRPN/CNPN": string;
 * "Date saisine CSRPN/CNPN": string;
 * "Nom de l’expert désigné (pour le CSRPN)": string;
 * "N° de l’avis Onagre ou interne": string;
 * "Avis CSRPN/CNPN": string;
 * "Date avis CSRPN/CNPN": string;
 * "Dérogation accordée": string;
 * "Date AP": string;
 * }} Ligne;
 */

/**
 * @typedef {"Autres" |
 *   "Autres EnR" |
 *   "Avis sur document d’urbanisme" |
 *   "Bâti (espèces anthropophiles)" |
 *   "Carrières" |
 *   "Dommages liés aux EP" |
 *   "Dessertes forestières" |
 *   "Éolien" |
 *   "Infrastructures linéaires" |
 *   "Inventaires, recherche scientifique" |
 *   "Manifestations sportives et culturelles" |
 *   "Naturalisation" |
 *   "Ouvrages cours d’eau" |
 *   "PPV" |
 *   "Projet agricole" |
 *   "Projet d’aménagement" |
 *   "Restauration" |
 *   "Transport de spécimens"} ThématiquesOptions
 */


/**
 * @type {Map<ThématiquesOptions, DossierDemarcheSimplifiee88444['Activité principale']>}
 */
const correspondanceThématiqueVersActivitéPrincipale = new Map([
    ["Autres", "Autre"],
    ["Autres EnR", "Production énergie renouvelable - Autres"],
    ["Avis sur document d’urbanisme", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Bâti (espèces anthropophiles)", "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"],
    ["Carrières", "Carrières"],
    ["Dommages liés aux EP", "Dommages aux biens et activités"],
    ["Dessertes forestières", "Exploitation forestière"],
    ["Éolien", "Production énergie renouvelable - Éolien"],
    ["Infrastructures linéaires", "Infrastructures de transport routières"],
    ["Inventaires, recherche scientifique", "Demande à caractère scientifique"],
    ["Manifestations sportives et culturelles", "Événementiel avec ou sans aménagement temporaire"],
    ["Naturalisation", "Restauration écologique"],
    ["Ouvrages cours d’eau", "Projets liés à la gestion de l’eau"],
    ["PPV", "Péril animalier"],
    ["Projet agricole", "Installations agricoles"],
    ["Projet d’aménagement", "ZAC"],
    ["Restauration", "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"],
    ["Transport de spécimens", "Conservation des espèces"]
]);


/**
 * 
 * @param {string} valeur
 * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
 */
function convertirThématiqueEnActivitéPrincipale(valeur) {
    const activité = correspondanceThématiqueVersActivitéPrincipale.get(    /** @type {ThématiquesOptions} */(valeur))
    if (activité) {
        return activité
    }
    return 'Autre';
}

/**
<<<<<<< HEAD
 * @description Données qui ne sont pas utilisées pour le pré-remplissage, 
 * mais qui seront utilisées pour remplir les annotations privées, ou d'autres 
 * données propres à Pitchou comme le suivi des dossiers
 * @typedef {{
 *   commentaire_libre: Dossier['commentaire_libre'],
 *   date_dépôt: Dossier['date_dépôt'],
 *   personne_mail: string | undefined,
 *   historique_dossier: string | undefined,
 *   historique_identifiant_demande_onagre: Dossier['historique_identifiant_demande_onagre'],
 *   prochaine_action_attendue_par: Dossier['prochaine_action_attendue_par'],
 *   DEP: string | undefined,
 *   date_de_depot_dep: string | undefined,
 *   saisine_csrpn_cnpn: string | undefined,
 *   date_saisine_csrpn_cnpn: string | undefined,
 *   nom_expert_csrpn: string | undefined,
 *   avis_csrpn_cnpn: string | undefined,
 *   date_avis_csrpn_cnpn: string | undefined,
 *   derogation_accordee: string | undefined,
 *   date_ap: string | undefined
 * }} DonnéesSupplémentaires
 */

/**
=======
>>>>>>> eca6bd7 (Remplissage du commentaire_enjeu pour les nouveaux imports)
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * @param {Ligne} ligne
 * @returns { DonnéesSupplémentaires } Données supplémentaires ou undefined
 */
export function créerDonnéesSupplémentairesDepuisLigne(ligne) {
    const commentaire_libre = (ligne['OBSERVATIONS'] || ligne['Description avancement dossier avec dates']) ? 'Description avancement dossier avec dates : ' + (ligne['Description avancement dossier avec dates'] ?? '') + '\nObservations : ' + (ligne['OBSERVATIONS'] ?? '') : ''

    const dep = ligne['DEP']
    const date_de_depot_dep = ligne['Date de dépôt DEP']
    const saisine_csrpn_cnpn = ligne['Saisine CSRPN/CNPN']
    const date_saisine_csrpn_cnpn = ligne['Date saisine CSRPN/CNPN']

    const nom_expert_csrpn = ligne['Nom de l’expert désigné (pour le CSRPN)']
    const avis_csrpn_cnpn = ligne['Avis CSRPN/CNPN']
    const date_avis_csrpn_cnpn = ligne['Date avis CSRPN/CNPN']
    const derogation_accordee = ligne['Dérogation accordée']
    const date_ap = ligne['Date AP']


    return {
        'commentaire_libre': commentaire_libre,
        'date_dépôt': ligne['Date de sollicitation'],
        'historique_identifiant_demande_onagre': ligne['N° de l’avis Onagre ou interne'],
        'prochaine_action_attendue_par': générerProchaineActionAttenduePar(ligne),

        // Champs pour la table arête_personne_suit_dossier
        'personne_mail': ligne['POUR\nATTRIBUTION'], // TODO : mettre le mail de la personne dont le prénom est la valeur de la colonne 'POUR ATTRIBUTION'

        // Infos utiles historiques dossier
        'historique_dossier': ligne['Description avancement dossier avec dates'],
        'DEP': dep,
        'date_de_depot_dep': date_de_depot_dep,
        'derogation_accordee': derogation_accordee,
        'date_ap': date_ap,

        // Infos utiles saisines CSRPN/CNPN
        'saisine_csrpn_cnpn': saisine_csrpn_cnpn,
        'date_saisine_csrpn_cnpn': date_saisine_csrpn_cnpn,
        'nom_expert_csrpn': nom_expert_csrpn,
        'avis_csrpn_cnpn': avis_csrpn_cnpn,
        'date_avis_csrpn_cnpn': date_avis_csrpn_cnpn,
    }
}

/**
 * Crée un objet dossier à partir d'une ligne d'import (inclut la recherche des données de localisation).
 * @param {Ligne} ligne
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444>>}
 */
export async function créerDossierDepuisLigne(ligne) {
    const donnéesLocalisations = await générerDonnéesLocalisations(ligne);
    const donnéesDemandeurs = générerDonnéesDemandeurs(ligne)

    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(créerDonnéesSupplémentairesDepuisLigne(ligne)),

        'Nom du projet': ligne['OBJET'],
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        'Avez-vous réalisé un état des lieux écologique complet ?': true, // Par défaut, on répond 'Oui' à cette question sinon les autres questions ne s'affichent pas sur DS et les réponses ne sont pas sauvegardées.

        "Commune(s) où se situe le projet": donnéesLocalisations['Commune(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Activité principale': convertirThématiqueEnActivitéPrincipale(ligne['Thématique']),
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": ['déclaration loi sur eau'].includes(ligne['Procédure associée'].toLowerCase()) ? 'Oui' : 'Non',
        'À quelle procédure le projet est-il soumis ?': ligne['Procédure associée'].toLowerCase() === 'déclaration loi sur eau' ? ["Autorisation loi sur l'eau"] : undefined,
        'Le demandeur est…': donnéesDemandeurs["Le demandeur est…"],
        'Adresse mail de contact': donnéesDemandeurs['Adresse mail de contact'],
        'Nom du représentant': donnéesDemandeurs['Nom du représentant'],
        'Prénom du représentant': donnéesDemandeurs['Prénom du représentant'],
        'Qualité du représentant': donnéesDemandeurs['Qualité du représentant'],
    };
}

/**
 * Extrait les informations du demandeur à partir d'une ligne d'import.
 *
 * - Si la catégorie du demandeur est "particulier", le type est "une personne physique" et seul le mail est renseigné.
 * - Sinon, le type est "une personne morale" et on tente d'extraire le nom et prénom du représentant à partir du champ "Nom contact – mail".
 * - Si le nom/prénom ne sont pas trouvés dans le champ, on tente de les déduire à partir de l'adresse mail.
 *
 * @param {Ligne} ligne Ligne d'import contenant les informations du demandeur
 * @returns {Pick<DossierDemarcheSimplifiee88444, "Le demandeur est…" | "Nom du représentant" | "Prénom du représentant" | "Adresse mail de contact" | 'Qualité du représentant'>}
 *   Objet contenant le type de demandeur, le nom/prénom du représentant (si applicable), et l'adresse mail de contact.
 */
function générerDonnéesDemandeurs(ligne) {
    const typeDemandeur = ligne['Catégorie du demandeur'].toLowerCase() === 'particulier' ? 'une personne physique' : 'une personne morale'

    const nomContactMailValeur = ligne['Nom contact – mail']

    const mail = extrairePremierMail(nomContactMailValeur) || "";

    /**@type {Partial<{prénom: string | undefined, nom: string | undefined}> | undefined | null} */
    let prénomNom = extraireNom(nomContactMailValeur)

    // Si pas de nom, on essaie de récupérer le nom et le prénom avec le mail
    if (!prénomNom && mail) {
        prénomNom = extraireNomDunMail(nomContactMailValeur)
    }

    if (typeDemandeur === 'une personne morale') {
        return {
            "Le demandeur est…": typeDemandeur,
            "Nom du représentant": prénomNom?.nom ?? '',
            "Prénom du représentant": prénomNom?.prénom ?? '',
            "Adresse mail de contact": mail,
            "Qualité du représentant": ligne['PETITIONNAIRE']
        }
    } else {
        return {
            "Le demandeur est…": typeDemandeur,
            "Adresse mail de contact": mail,
            "Nom du représentant": '',
            "Prénom du représentant": '',
            "Qualité du représentant": '',
        }
    }

}

/**
 * 
 * @param {{Communes: string | undefined, Département: number | string}} ligne 
 * @returns { Promise<
 *              Partial<Pick<DossierDemarcheSimplifiee88444,
 *                  "Commune(s) où se situe le projet" | 
 *                  "Département(s) où se situe le projet" |
 *                  "Le projet se situe au niveau…"
 *              >> & Pick<DossierDemarcheSimplifiee88444, "Dans quel département se localise majoritairement votre projet ?">
 *           >}
 */
async function générerDonnéesLocalisations(ligne) {
    const valeursCommunes = extraireCommunes(ligne['Communes'] ?? '');

    const communesP = valeursCommunes.map((com) => getCommuneData(com));
    const départementsP = formaterDépartementDepuisValeur(ligne['Département']);

    const [départements, communesResult] = await Promise.all([
        départementsP,
        Promise.all(communesP),
    ]);

    const communes = communesResult.filter((commune) => commune !== null);


    if (communes.length >= 1) {
        return {
            "Commune(s) où se situe le projet": communes,
            "Département(s) où se situe le projet": undefined,
            "Le projet se situe au niveau…": "d'une ou plusieurs communes",
            "Dans quel département se localise majoritairement votre projet ?": départements[0],
        }
    } else {
        return {
            "Commune(s) où se situe le projet": undefined,
            "Département(s) où se situe le projet": départements,
            "Le projet se situe au niveau…": "d'un ou plusieurs départements",
            "Dans quel département se localise majoritairement votre projet ?": départements[0]
        }
    }
}


/**
 * Cette fonction permet de remplir le champ "prochaine_action_attendue_par" en base de données
 * @param {Ligne} ligne 
 * @returns {string}
 */
function générerProchaineActionAttenduePar(ligne) {
    const valeur = ligne['Stade de l’avis'].trim();

    if (valeur === 'En attente d’éléments pétitionnaire') {
        return 'Pétitionnaire'

    } else if (valeur === 'En attente avis CSRPN/CNPN') {

        return 'CNPN/CSRPN'
    } else if (valeur === 'Clos') {
        return 'Personne'
    }

    // Par défaut, on considère que la prochaine action attendue est celle de l'instruteur.i.ce
    return 'Instructeur'
}