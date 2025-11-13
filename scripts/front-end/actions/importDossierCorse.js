//@ts-check

/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */
/** @import { DonnéesSupplémentairesPourCréationDossier } from "./importDossierUtils" */
import { formaterDépartementDepuisValeur, extraireCommunes, getCommuneData } from "./importDossierUtils";


/**
 * @typedef {{
 *   Remarques: string;
 *   Département: string;
 *   Commune: string;
 *   "Nom du demandeur": string;
 *   "Type de projet": string;
 *   "Libellé Projet": string;
 *   "Service Pilote": string;
 *   "Espèces impactées": string;
 *   Raccourci: string;
 *   Statut: string;
 *   "Niveau d'avancement": string;
 *   "Date de début d'accompagnement": number;
 *   "Date de réception 1er dossier": string | number | Date;
 *   "Date de réception du dossier complet": string | Date;
 *   "Nombre de jours restant pour instruction dossier": string;
 *   "N°ONAGRE": string;
 *   "Date de dépôt sur ONAGRE": string | Date;
 *   "Instructeur DREAL": string;
 *   Compétence: string;
 *   "Avis rendu": string;
 *   "Date avis": string;
 *   Contribution: string;
 *   "Commentaires phase instruction": string;
 *   "Début consultation": string;
 *   "Fin de publication": string | Date;
 *   "Numéro AP": string;
 *   "Date AP": string | Date;
 *   "Commentaires post AP": string;
 * }} LigneDossierCorse // D'après le tableau envoyé le 25/07/2025
 */


/**
 * @param {LigneDossierCorse} ligne
 * @return {string}
 */
export function créerNomPourDossier(ligne) {
    return ligne['Libellé Projet']
}

/**
 * @typedef {"ZAE" |
 *   "Autres" |
 *   "Carrière (ICPE)" |
 *   "Centre de tri (ICPE)" |
 *   "Centre de vacances" |
 *   "Électrique" |
 *   "Hydroélectrique" |
 *   "Ouvrages d’art" |
 *   "Projet immobilier" |
 *   "Routes" |
 *   "Stockage de déchets (ISDND)"
 * } TypeDeProjetOptions
 */

/**
 * @type {Map<TypeDeProjetOptions,  DossierDemarcheSimplifiee88444['Activité principale']>}
 */
const correspondanceTypeDeProjetVersActivitéPrincipale = new Map([
    ["ZAE", "ZAC"],
    ["Autres", "Autre"],
    ["Carrière (ICPE)", "Carrières"],
    ["Centre de tri (ICPE)", "Installations de gestion des déchets"],
    ["Centre de vacances", "Installations de loisir et de tourisme"],
    ["Électrique", "Transport énergie électrique"],
    ["Hydroélectrique", "Production énergie renouvelable - Hydroélectricité"],
    ["Ouvrages d’art", "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art"],
    ["Projet immobilier", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Routes", "Infrastructures de transport routières"],
    ["Stockage de déchets (ISDND)", "Installations de gestion des déchets"]
]);


/**
 *
 * @param {LigneDossierCorse} ligne
 * @param {string[]} warnings
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
 */
function convertirTypeDeProjetEnActivitéPrincipale(ligne, warnings, activitésPrincipales88444) {
    const typeDeProjet = ligne['Type de projet'].trim()

    // Si le type de projet est déjà une valeur pitchou
    // @ts-ignore
    if (activitésPrincipales88444.has(typeDeProjet)) {
        // @ts-ignore
        return typeDeProjet
    }

    const activité = correspondanceTypeDeProjetVersActivitéPrincipale.get(    /** @type {TypeDeProjetOptions} */(typeDeProjet))
    if (activité) {
        return activité
    }

    const messageWarning = `Le type de projet de ce dossier est ${typeDeProjet}. Cette activité n'existe pas dans la liste des Activités Principales de la démarche 88444 (dans Pitchou). On attribue donc l'activité "Autre" à ce projet.`
    console.warn(messageWarning);
    warnings.push(messageWarning)

    return 'Autre';
}

/**
 *
 * @param {{Commune: string | undefined, Département: number | string}} ligne
 * @param {string[]} [warnings]
 * @returns { Promise<
 *              Partial<Pick<DossierDemarcheSimplifiee88444,
 *                  "Commune(s) où se situe le projet" |
 *                  "Département(s) où se situe le projet" |
 *                  "Le projet se situe au niveau…"
 *              >> & Pick<DossierDemarcheSimplifiee88444, "Dans quel département se localise majoritairement votre projet ?">
 *           >}
 */
async function générerDonnéesLocalisations(ligne, warnings) {
    const départementParDéfaut = {code: '2A', nom: 'Corse-du-Sud'}

    const valeursCommunes = extraireCommunes(ligne['Commune'] ?? '');

    const communesP = valeursCommunes.map((com) => getCommuneData(com, warnings));
    const départementsP = formaterDépartementDepuisValeur(ligne['Département']);

    const [départementsTrouvés, communesResult] = await Promise.all([
        départementsP,
        Promise.all(communesP),
    ]);

    const communes = communesResult.filter((commune) => commune !== null);

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
        const départements =  Array.isArray(départementsTrouvés) ? départementsTrouvés : [départementParDéfaut]
        return {
            "Commune(s) où se situe le projet": undefined,
            "Département(s) où se situe le projet": départements,
            "Le projet se situe au niveau…": "d'un ou plusieurs départements",
            "Dans quel département se localise majoritairement votre projet ?": départements[0]
        }
    }
}


/**
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * @param {LigneDossierCorse} ligne
 * @returns { DonnéesSupplémentairesPourCréationDossier }d
 */
function créerDonnéesSupplémentairesDepuisLigne(ligne) {
    return {
        dossier: {
            'historique_identifiant_demande_onagre': ligne['N°ONAGRE'],
            'date_dépôt': new Date(), // TODO : choisir la bonne colonne qui renseigne de la date de première sollicitation (correspondant à la date dépôt de Pitchou)
        },
    }
}


/**
 * Crée un objet dossier à partir d'une ligne d'import).
 * @param {LigneDossierCorse} ligne
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444 & { warnings: string[] }>>}
 */
export async function créerDossierDepuisLigne(ligne, activitésPrincipales88444) {
    /** @type {string[]} */
    let warnings = []

    const donnéesLocalisations =  await générerDonnéesLocalisations(ligne, warnings)
    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(créerDonnéesSupplémentairesDepuisLigne(ligne)),

        'Nom du projet': créerNomPourDossier(ligne),
        'Activité principale': convertirTypeDeProjetEnActivitéPrincipale(ligne, warnings, activitésPrincipales88444),
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        'Commune(s) où se situe le projet': donnéesLocalisations['Commune(s) où se situe le projet'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],

        warnings: warnings.length>=1 ? warnings : undefined,

    };
}

/**
 * Vérifie si un dossier spécifique à importer existe déjà dans la base de données.
 * La recherche s'effectue en comparant le nom du projet (champ 'nom' de la table 'dossier')
 * ainsi que le numéro Onagre.
 * On utilise le numéro Onagre car plusieurs projets du tableau possèdent le même nom de projet (colonne Libellé).
 * @param {LigneDossierCorse} ligne
 * @param {Set<string | null>} nomsEnBDD
 * @param {Map<string | null, string | null>} nomToHistoriqueIdentifiantDemandeOnagre
 * @returns {boolean}
 */
export function ligneDossierEnBDD(ligne, nomsEnBDD, nomToHistoriqueIdentifiantDemandeOnagre) {
    const nom = créerNomPourDossier(ligne);
    const numéroOnagre = ligne["N°ONAGRE"];
    if (!nom || nom === "") {
        console.warn(
            `Attention, il n'y a pas de libellé pour le projet de la ligne ${JSON.stringify(ligne)}`,
        );
        return false;
    }
    if (nomsEnBDD.has(nom)) {
        return (
            nomToHistoriqueIdentifiantDemandeOnagre.get(nom) ===
            numéroOnagre
        );
    } else {
        return false;
    }
}