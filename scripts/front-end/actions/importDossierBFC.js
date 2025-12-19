//@ts-check
/** @import { DonnéesSupplémentairesPourCréationDossier } from "./importDossierUtils" */
/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarche-numérique/DémarcheSimplifiée88444" */
/** @import { PartialBy }  from '../../types/tools' */
/** @import {VNementPhaseDossierInitializer as ÉvènementPhaseDossierInitializer}  from '../../types/database/public/ÉvènementPhaseDossier' */
/** @import {DCisionAdministrativeInitializer as DécisionAdministrativeInitializer}  from '../../types/database/public/DécisionAdministrative' */
/** @import {AvisExpertInitializer}  from '../../types/database/public/AvisExpert' */


import { addMonths } from "date-fns";
import { isValidDateString } from "../../commun/typeFormat";
import { extrairePremierMail, extraireNom, extraireNomDunMail, formaterDépartementDepuisValeur, extraireCommunes, getCommuneData } from "./importDossierUtils";


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
 * }} LigneDossierBFC;
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


/** @type {Map<ThématiquesOptions, DossierDemarcheSimplifiee88444['Activité principale']>} */
const correspondanceThématiqueVersActivitéPrincipale = new Map([
    ["Autres", "Autre"],
    ["Autres EnR", "Production énergie renouvelable - Méthaniseur, biomasse"],
    ["Avis sur document d’urbanisme", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Bâti (espèces anthropophiles)", "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"],
    ["Carrières", "Carrières"],
    ["Dommages liés aux EP", "Dommages aux biens et activités"],
    ["Dessertes forestières", "Exploitation forestière"],
    ["Éolien", "Production énergie renouvelable - Éolien"],
    ["Inventaires, recherche scientifique", "Demande à caractère scientifique"],
    ["Manifestations sportives et culturelles", "Événementiel avec ou sans aménagement temporaire"],
    ["Naturalisation", "Pédagogique enseignement"],
    ["Ouvrages cours d’eau", "Projets liés à la gestion de l’eau"],
    ["PPV", "Production énergie renouvelable - Photovoltaïque"],
    ["Projet agricole", "Installations agricoles"],
    ["Projet d’aménagement", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Restauration", "Restauration écologique"],
    ["Transport de spécimens", "Production énergie renouvelable - Éolien -  Suivi mortalité"]
]);


/**
 *
 * @param {string} thématiqueBFC
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
 */
function convertirThématiqueEnActivitéPrincipale(thématiqueBFC, activitésPrincipales88444) {

    // Si la thématique est déjà une valeur pitchou
    // @ts-ignore
    if(activitésPrincipales88444.has(thématiqueBFC)){
        // @ts-ignore
        return thématiqueBFC
    }

    const activité = correspondanceThématiqueVersActivitéPrincipale.get(    /** @type {ThématiquesOptions} */(thématiqueBFC))
    if (activité) {
        return activité
    }

    console.warn("Thématique BFC non associée à une activité Pitchou", thématiqueBFC)

    return 'Autre';
}

/**
 * @param {LigneDossierBFC} ligne
 * @return {string}
 */
export function créerNomPourDossier(ligne) {
    return 'N° Dossier DEROG ' + ligne['N° Dossier DEROG'] + ' - ' + ligne['OBJET']
}

/**
 * Crée un objet dossier à partir d'une ligne d'import (inclut la recherche des données de localisation).
 * @param {LigneDossierBFC} ligne
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444>>}
 */
export async function créerDossierDepuisLigne(ligne, activitésPrincipales88444) {
    const donnéesLocalisations = await générerDonnéesLocalisations(ligne);
    const donnéesDemandeurs = générerDonnéesDemandeurs(ligne)
    const donnéesAutorisationEnvironnementale = générerDonnéesAutorisationEnvironnementale(ligne)

    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(créerDonnéesSupplémentairesDepuisLigne(ligne)),

        'Nom du projet': créerNomPourDossier(ligne),
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        'Avez-vous réalisé un état des lieux écologique complet ?': true, // Par défaut, on répond 'Oui' à cette question sinon les autres questions ne s'affichent pas sur DS et les réponses ne sont pas sauvegardées.

        "Commune(s) où se situe le projet": donnéesLocalisations['Commune(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Activité principale': convertirThématiqueEnActivitéPrincipale(ligne['Thématique'], activitésPrincipales88444),
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": donnéesAutorisationEnvironnementale["Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"],
        'À quelle procédure le projet est-il soumis ?': donnéesAutorisationEnvironnementale['À quelle procédure le projet est-il soumis ?'],
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
 * @param {LigneDossierBFC} ligne Ligne d'import contenant les informations du demandeur
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
 * @param {LigneDossierBFC} ligne
 * @returns {Pick<DossierDemarcheSimplifiee88444, "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?" | "À quelle procédure le projet est-il soumis ?">}
 */
function générerDonnéesAutorisationEnvironnementale(ligne) {
    const procedure_associée = ligne['Procédure associée'].toLowerCase();

    if (procedure_associée === "autorisation environnementale") {
        return {
            "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Oui',
            "À quelle procédure le projet est-il soumis ?": ["Autorisation ICPE", "Autorisation loi sur l'eau"]
        };
    }

    return {
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": 'Non',
        "À quelle procédure le projet est-il soumis ?": []
    };
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

    const [résultatDépartements, communesResult] = await Promise.all([
        départementsP,
        Promise.all(communesP),
    ]);

    const communes = communesResult
        .map((communeRésultat) => communeRésultat.data)
        .filter((commune) => commune !== null);

    const départementsTrouvés = résultatDépartements.data

    const départementColonne = Array.isArray(départementsTrouvés) && départementsTrouvés[0] ? 
        départementsTrouvés[0] : 
        undefined

    if (communes.length >= 1) {
        const départementPremièreCommune = communes[0].departement

        return {
            "Commune(s) où se situe le projet": communes,
            "Département(s) où se situe le projet": undefined,
            "Le projet se situe au niveau…": "d'une ou plusieurs communes",
            "Dans quel département se localise majoritairement votre projet ?": départementColonne ?? départementPremièreCommune
        }
    } else {
        const départements =  Array.isArray(départementsTrouvés) ? départementsTrouvés : [{code: '25', nom: 'Doubs'}] // La valeur par défaut est le département du siège de la DREAL BFC
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
 * @param {LigneDossierBFC} ligne
 * @returns {string}
 */
function générerProchaineActionAttenduePar(ligne) {
    const valeur = ligne['Stade de l’avis'].trim();

    if (valeur === 'En attente d’éléments pétitionnaire') {
        return 'Pétitionnaire'
    } else if (valeur === 'En attente avis CSRPN/CNPN') {
        return 'CNPN/CSRPN'
    } else if (valeur === "En cours d’examen par DBIO") {
        return 'Autre administration'
    } else if (valeur === "En attente signature") {
        return 'Autre administration'
    } else if (valeur === 'Clos') {
        return 'Personne'
    }

    // Par défaut, on considère que la prochaine action attendue est celle de l'instruteur.i.ce
    return 'Instructeur'
}

/**
 *
 * @param {LigneDossierBFC} ligne
 * @returns {PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesEvénementPhaseDossier(ligne) {
    const aujourdhui = new Date()

    /**@type {PartialBy<ÉvènementPhaseDossierInitializer, 'dossier'>[]} */
    const donnéesEvénementPhaseDossier = []

    const ligneEtapeProjet = ligne['Etapes du projet'].trim()

    // Rajout de l'évènement phase Accompagnement amont
    if (ligneEtapeProjet === 'Phase amont' ||
        ligneEtapeProjet === 'Pôle EnR' ||
        ligneEtapeProjet === 'Contentieux') {
        donnéesEvénementPhaseDossier.push({
            phase: 'Accompagnement amont',
            horodatage: isValidDateString(ligne['Date de sollicitation'].toString()) ? new Date(ligne['Date de sollicitation']) : aujourdhui
        })
    }

    // Rajout de l'évènement phase Instruction
    if (ligne['DEP'].toLowerCase().trim() === 'oui') {
        if (!isValidDateString(ligne['Date de dépôt DEP'])) {
            console.warn(`Date de dépôt DEP invalide : La colonne DEP spécifie "oui" mais la date de Dépôt DEP n'est pas valide. On prend alors la date de sollictation si elle est valide, sinon la date d'aujourd'hui.`)
        }
        donnéesEvénementPhaseDossier.push({
            phase: 'Instruction',
            horodatage: isValidDateString(ligne['Date de dépôt DEP']) ? new Date(ligne['Date de dépôt DEP']) : isValidDateString(ligne['Date de sollicitation'].toString()) ? new Date(ligne['Date de sollicitation']) : aujourdhui
        })
    } else if (ligneEtapeProjet === "Phase d’instruction") {
        donnéesEvénementPhaseDossier.push({
            phase: 'Instruction',
            horodatage: isValidDateString(ligne['Date de dépôt DEP']) ? new Date(ligne['Date de dépôt DEP']) : isValidDateString(ligne['Date de sollicitation'].toString()) ? addMonths(new Date(ligne['Date de sollicitation']), 1) : aujourdhui
        })
    }

    // Rajout de l'évènement phase Contrôle
    if (isValidDateString(ligne["Date AP"])) {
        donnéesEvénementPhaseDossier.push({
            phase: 'Contrôle',
            horodatage: new Date(ligne["Date AP"])
        })
    } else if (ligneEtapeProjet === 'Contrôle') {
        donnéesEvénementPhaseDossier.push({
            phase: 'Contrôle',
            horodatage: isValidDateString(ligne['Date de sollicitation'].toString()) ? addMonths(new Date(ligne['Date de sollicitation']), 3) : aujourdhui
        })
    }


    if (donnéesEvénementPhaseDossier.length >= 1) {
        return donnéesEvénementPhaseDossier
    } else {
        return undefined
    }
}

/**
 *
 * @param {LigneDossierBFC} ligne
 * @returns {PartialBy<DécisionAdministrativeInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesDécisionAdministrative(ligne) {
    let décision_administrative

    const ligneDérogationAccordée = ligne['Dérogation accordée'].trim().toLowerCase()

    let date_signature = isValidDateString(ligne['Date AP']) ? new Date(ligne['Date AP']) : addMonths(new Date(ligne['Date de sollicitation']), 3)

    if (ligneDérogationAccordée === 'non') {
        décision_administrative = {
            date_signature,
            type: 'Arrêté refus',
        }
    } else if (ligneDérogationAccordée === 'oui' || ligneDérogationAccordée === 'autorisé avec dep') {
        décision_administrative = {
            date_signature,
            type: 'Arrêté dérogation'
        }
    }

    if (décision_administrative) {
        return [décision_administrative]
    }

}

/**
 *
 * @param {LigneDossierBFC} ligne
 * @returns {PartialBy<AvisExpertInitializer, 'dossier'>[] | undefined}
 */
function créerDonnéesAvisExpert(ligne) {
    const saisine_csrpn_cnpn = ligne['Saisine CSRPN/CNPN']
    const date_saisine_csrpn_cnpn = ligne['Date saisine CSRPN/CNPN']
    const avis_csrpn_cnpn = ligne['Avis CSRPN/CNPN']
    const date_avis_csrpn_cnpn = ligne['Date avis CSRPN/CNPN']

    if (saisine_csrpn_cnpn && saisine_csrpn_cnpn.trim().length>=1) {
        return [{
            expert: saisine_csrpn_cnpn,
            date_saisine: isValidDateString(date_saisine_csrpn_cnpn) ? new Date(date_saisine_csrpn_cnpn) : undefined,
            avis: avis_csrpn_cnpn && avis_csrpn_cnpn.length >= 1 ? avis_csrpn_cnpn : undefined,
            date_avis: isValidDateString(date_avis_csrpn_cnpn) ? new Date(date_avis_csrpn_cnpn) : undefined,
        }]
    }
}

/**
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * @param {LigneDossierBFC} ligne
 * @returns { DonnéesSupplémentairesPourCréationDossier } Données supplémentaires ou undefined
 */
export function créerDonnéesSupplémentairesDepuisLigne(ligne) {
    const description = ligne['Description avancement dossier avec dates']
        ? 'Description avancement dossier avec dates : ' + ligne['Description avancement dossier avec dates']
        : '';
    const observations = ligne['OBSERVATIONS']
        ? 'Observations : ' + ligne['OBSERVATIONS']
        : '';

    const sollicitationOFB = ligne['Sollicitation OFB pour avis'].toLowerCase() === 'oui' ? 'Ce dossier nécessite une sollicitation OFB pour avis.' : null
    const commentaire_libre = [description, observations, sollicitationOFB]
        .filter(value => value?.trim())
        .join('\n');

    if (!isValidDateString(ligne['Date de sollicitation'].toString())) {
        console.warn('Date de sollicitation invalide.')
    }



    const emailTrouvé = extrairePremierMail(ligne['POUR\nATTRIBUTION'])

    const personnes_qui_suivent = emailTrouvé ? [{email: emailTrouvé}] : undefined;

    const donnéesEvénementPhaseDossier = créerDonnéesEvénementPhaseDossier(ligne)

    const décision_administrative = créerDonnéesDécisionAdministrative(ligne)

    const avis_expert = créerDonnéesAvisExpert(ligne)



    return {
        dossier: {
            'commentaire_libre': commentaire_libre,
            'date_dépôt': isValidDateString(ligne['Date de sollicitation'].toString()) ? ligne['Date de sollicitation'] : new Date(),
            'historique_identifiant_demande_onagre': ligne['N° de l’avis Onagre ou interne'] && ligne['N° de l’avis Onagre ou interne'].trim().length >= 1 ? ligne['N° de l’avis Onagre ou interne'] : undefined,
            'prochaine_action_attendue_par': générerProchaineActionAttenduePar(ligne),
        },
        évènement_phase_dossier: donnéesEvénementPhaseDossier,
        avis_expert,
        décision_administrative,
        personnes_qui_suivent,
    }
}
