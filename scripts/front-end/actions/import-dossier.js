//@ts-check

//@ts-ignore
/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarches-simplifiées/DémarcheSimplifiée88444" */
//@ts-ignore
/** @import { GeoAPIDépartement, GeoAPICommune }  from '../../types/GeoAPI' */

/**
 * 
 * @param {string} nomCommune 
 * @returns {Promise<[GeoAPICommune] | null>}
 * @see {@link https://geo.api.gouv.fr/decoupage-administratif/communes}
 */
async function getCommuneData(nomCommune) {
    const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomCommune)}&fields=codeDepartement,codeRegion,codesPostaux,population,codeEpci,siren&format=json&geometry=centre`);
    const data = await response.json();

    if (!data.length) {
        console.error(`La commune n'a pas été trouvée par geo.api.gouv.fr. Nom de la commune : ${nomCommune}.`);
        return null
    }

    const commune = data[0];

    return [{
        nom: commune.nom,
        code: commune.code,
        codeDepartement: commune.codeDepartement,
        codeEpci: commune.codeEpci,
        codeRegion: commune.codeRegion,
        codesPostaux: commune.codesPostaux,
        population: commune.population,
        siren: commune.siren
    }];
}

/**
 * 
 * @param {string} code 
 * @returns {Promise<GeoAPIDépartement | null>}
 * @see {@link https://geo.api.gouv.fr/decoupage-administratif/communes}
 */
async function getDépartementData(code) {
    const response = await fetch(`https://geo.api.gouv.fr/departements/${encodeURIComponent(code)}`);
    const département = await response.json();

    if (!département) {
        console.error(`Le département n'a pas été trouvé par geo.api.gouv.fr. Code du département : ${code}.`);
        return null
    }

    return (
        {
            code: département.code,
            nom: département.nom
        }
    )
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
export async function générerDonnéesLocalisations(ligne) {
    const valeursCommunes = ligne['Communes']
        ?.trim()
        .replace(/"/g, '') // supprime les guillemets
        .toLowerCase()     // passe tout en minuscules
        .replace(/\b\w/g, c => c.toUpperCase()); // majuscule en début de mot

    const communes = await getCommuneData(valeursCommunes ?? '')

    const départements = await formaterDépartementDepuisValeur(ligne['Département'])

    if (communes) {
        return ({
            "Commune(s) où se situe le projet": communes,
            "Département(s) où se situe le projet": undefined,
            "Le projet se situe au niveau…": "d'une ou plusieurs communes",
            "Dans quel département se localise majoritairement votre projet ?": départements[0],
        })
    } else {
        return ({
            "Commune(s) où se situe le projet": undefined,
            "Département(s) où se situe le projet": départements,
            "Le projet se situe au niveau…": 'd\'un ou plusieurs départements',
            "Dans quel département se localise majoritairement votre projet ?": départements[0]
        })
    }
}

/**
 * Formate une valeur (code ou chaîne) en un ou plusieurs départements reconnus.
 * @param {string | number} valeur
 * @returns {Promise<[GeoAPIDépartement, ...GeoAPIDépartement]>}
 */
async function formaterDépartementDepuisValeur(valeur) {
    /** @type {string[]} */
    let codes = []
    if (typeof valeur === 'number') {
        codes = [valeur.toString()];
    }
    if (typeof valeur === 'string') {
        const blocs = valeur.split('-');
        for (const bloc of blocs) {
            codes.push(bloc)
        }

        /** @type {GeoAPIDépartement[]} */
        let départements = []
        for (const code of codes) {
            const département = await getDépartementData(code)
            if (département) {
                départements.push(département)
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
