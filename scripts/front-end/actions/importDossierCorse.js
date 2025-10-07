//@ts-check

/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */
/** @import { DonnéesSupplémentairesPourCréationDossier } from "./importDossierUtils" */


//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;


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
 *   "Projet Immobilier" |
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
    ["Projet Immobilier", "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)"],
    ["Routes", "Infrastructures de transport routières"],
    ["Stockage de déchets (ISDND)", "Installations de gestion des déchets"]
]);


/**
 *
 * @param {LigneDossierCorse} ligne
 * @param {Set<DossierDemarcheSimplifiee88444['Activité principale']>} activitésPrincipales88444
 * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
 */
function convertirTypeDeProjetEnActivitéPrincipale(ligne, activitésPrincipales88444) {
    const typeDeProjet = ligne['Type de projet']

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

    console.warn("Type de projet non associé à une activité Pitchou", typeDeProjet)

    return 'Autre';
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
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444>>}
 */
export async function créerDossierDepuisLigne(ligne, activitésPrincipales88444) {
    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': JSON.stringify(créerDonnéesSupplémentairesDepuisLigne(ligne)),

        'Nom du projet': créerNomPourDossier(ligne),
        'Activité principale': convertirTypeDeProjetEnActivitéPrincipale(ligne, activitésPrincipales88444),

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