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
async function générerDonnéesLocalisations(ligne) {
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
function convertirThématiqueEnActivitéPrincipale(valeur) {
    if (valeur in correspondanceThématiqueVersActivitéPrincipale) {
        // @ts-ignore
        return correspondanceThématiqueVersActivitéPrincipale[valeur];
    }
    return 'Autre';
}

/** Ce type doit être le même que le type Ligne dans `scripts/front-end/components/screens/ImportDossier.svelte`
 * @typedef {{
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
 * Extrait les données supplémentaires (NE PAS MODIFIER) depuis une ligne d'import.
 * Retourne undefined si toutes les valeurs sont vides ou undefined.
 * @param {Ligne} ligne
 * @returns {string|undefined} Données supplémentaires sérialisées ou undefined
 */
export function créerDonnéesSupplémentairesDepuisLigne(ligne) {
    const commentaire = 'Description avancement dossier avec dates : ' + (ligne['Description avancement dossier avec dates'] ?? '') + '\nObservations : ' + (ligne['OBSERVATIONS'] ?? '');
    const date_dépôt = ligne['Date de sollicitation'];
    const suivi_par = ligne['POUR\nATTRIBUTION'];
    const historique_dossier = ligne['Description avancement dossier avec dates'];
    const numero_avis_onagre_ou_interne = ligne['N° de l’avis Onagre ou interne'];
    const stade_avis = ligne['Stade de l’avis']
    const dep = ligne['DEP']
    const date_de_depot_dep = ligne['Date de dépôt DEP']
    const saisine_csrpn_cnpn = ligne['Saisine CSRPN/CNPN']
    const date_saisine_csrpn_cnpn = ligne['Date saisine CSRPN/CNPN']
    const nom_expert_csrpn = ligne['Nom de l’expert désigné (pour le CSRPN)']
    const avis_csrpn_cnpn = ligne['Avis CSRPN/CNPN']
    const date_avis_csrpn_cnpn = ligne['Date avis CSRPN/CNPN']
    const derogation_accordee = ligne['Dérogation accordée']
    const date_ap = ligne['Date AP']



    // Vérifie si toutes les valeurs sont vides ou undefined
    const toutesVides =
        [ligne['OBSERVATIONS'], ligne['Description avancement dossier avec dates'], date_dépôt, suivi_par, historique_dossier, numero_avis_onagre_ou_interne, dep, stade_avis, date_de_depot_dep, saisine_csrpn_cnpn, date_saisine_csrpn_cnpn, nom_expert_csrpn, avis_csrpn_cnpn, date_avis_csrpn_cnpn, derogation_accordee, date_ap]
            .every(val => val === undefined || val === '');

    if (toutesVides) return undefined;

    return JSON.stringify({
        'commentaire': commentaire,
        'date_dépôt': date_dépôt,
        'suivi_par': suivi_par,
        'historique_dossier': historique_dossier,
        'numero_avis_onagre_ou_interne': numero_avis_onagre_ou_interne,
        'stade_avis': stade_avis,
        'DEP': dep,
        'date_de_depot_dep': date_de_depot_dep,
        'saisine_csrpn_cnpn': saisine_csrpn_cnpn,
        'date_saisine_csrpn_cnpn': date_saisine_csrpn_cnpn,
        'nom_expert_csrpn': nom_expert_csrpn,
        'avis_csrpn_cnpn': avis_csrpn_cnpn,
        'date_avis_csrpn_cnpn': date_avis_csrpn_cnpn,
        'derogation_accordee': derogation_accordee,
        'date_ap': date_ap
    });
}

/**
 * Crée un objet dossier à partir d'une ligne d'import (inclut la recherche des données de localisation).
 * @param {Ligne} ligne
 * @returns {Promise<Partial<DossierDemarcheSimplifiee88444>>}
 */
export async function créerDossierDepuisLigne(ligne) {
    const donnéesLocalisations = await générerDonnéesLocalisations(ligne);
    return {
        'NE PAS MODIFIER - Données techniques associées à votre dossier': créerDonnéesSupplémentairesDepuisLigne(ligne),

        'Nom du projet': ligne['OBJET'],
        'Dans quel département se localise majoritairement votre projet ?': donnéesLocalisations['Dans quel département se localise majoritairement votre projet ?'],
        "Commune(s) où se situe le projet": donnéesLocalisations['Commune(s) où se situe le projet'],
        'Le projet se situe au niveau…': donnéesLocalisations['Le projet se situe au niveau…'],
        'Département(s) où se situe le projet': donnéesLocalisations['Département(s) où se situe le projet'],
        'Activité principale': convertirThématiqueEnActivitéPrincipale(ligne['Thématique']),
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": ['autorisation environnementale', 'déclaration loi sur eau'].includes(ligne['Procédure associée'].toLowerCase()) ? 'Oui' : 'Non',
        'À quelle procédure le projet est-il soumis ?': ligne['Procédure associée'].toLowerCase() === 'déclaration loi sur eau' ? ['Autorisation loi sur l\'eau'] : undefined,
        'Le demandeur est…': ligne['Catégorie du demandeur'].toLowerCase() === 'particulier' ? 'une personne physique' : 'une personne morale',
    };
}
