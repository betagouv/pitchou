//@ts-check

/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */
/** @import { GeoAPIDépartement }  from '../../types/GeoAPI' */

const départementsParCode = {
    21: "Côte-d'Or",
    25: "Doubs",
    39: "Jura",
    58: "Nièvre",
    70: "Haute-Saône",
    71: "Saône-et-Loire",
    89: "Yonne",
    90: "Territoire de Belfort",
};

/**
 * Formate une valeur (code ou chaîne) en un ou plusieurs départements reconnus.
 * @param {string | number} valeur
 * @returns {[GeoAPIDépartement, ...GeoAPIDépartement]}
 */
export function formaterDépartementDepuisValeur(valeur) {
    const départementValides = Object.keys(départementsParCode).map((dep) => dep.toString());

    if (typeof valeur === 'number' && [21,25,39,58,70,71,89,90].includes(valeur)) {
        /** @type {keyof typeof départementsParCode} */
        // @ts-ignore
        const code = valeur;
        return [{
            code: code.toString(),
            nom: départementsParCode[code]
        }];
    }
    if (typeof valeur === 'string') {
        const blocs = valeur.split('-');
        /** @type {GeoAPIDépartement[]} */
        const départements = [];
        for (const bloc of blocs) {
            if (départementValides.includes(bloc)) {
                /** @type {keyof typeof départementsParCode} */
                // @ts-ignore
                const code = bloc;
                départements.push({
                    code: code.toString(),
                    nom: départementsParCode[code]
                });
            }
        }
        if (départements.length >= 1) {
            // On force le cast car la logique garantit un tableau non vide
            return /** @type {[GeoAPIDépartement, ...GeoAPIDépartement[]]} */ (départements);
        }
    }
    // Par défaut, on retourne le département Côte-d'Or
    return [{
        code: '21',
        nom: `Côte-d'Or`
    }];
} 

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
 * @type {Record<ThématiquesOptions, DossierDemarcheSimplifiee88444['Activité principale']>}
 */
const correspondanceThématiqueVersActivitéPrincipale = {
    "Autres": "Autre",
    "Autres EnR": "Production énergie renouvelable - Autres",
    "Avis sur document d’urbanisme": "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
    "Bâti (espèces anthropophiles)": "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    "Carrières": "Carrières",
    "Dommages liés aux EP": "Dommages aux biens et activités",
    "Dessertes forestières": "Exploitation forestière",
    "Éolien": "Production énergie renouvelable - Éolien",
    "Infrastructures linéaires": "Infrastructures de transport routières",
    "Inventaires, recherche scientifique": "Demande à caractère scientifique",
    "Manifestations sportives et culturelles": "Événementiel avec ou sans aménagement temporaire",
    "Naturalisation": "Restauration écologique",
    "Ouvrages cours d’eau": "Projets liés à la gestion de l’eau",
    "PPV": "Péril animalier",
    "Projet agricole": "Installations agricoles",
    "Projet d’aménagement": "ZAC",
    "Restauration": "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    "Transport de spécimens": "Conservation des espèces"
}

    /**
     * 
     * @param {string} valeur
     * @returns {DossierDemarcheSimplifiee88444['Activité principale']}
     */
    export function convertirThématiqueEnActivitéPrincipale(valeur) {
    if (valeur in correspondanceThématiqueVersActivitéPrincipale) {
        // @ts-ignore
        return correspondanceThématiqueVersActivitéPrincipale[valeur];
    }
    return 'Autre';
    }
