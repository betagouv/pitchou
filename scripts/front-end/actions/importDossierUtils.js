/** @import { GeoAPIDépartement, GeoAPICommune }  from '../../types/GeoAPI' */
/** @import { DossierPourInsertGénérique,  } from '../../types/démarche-numérique/DossierPourSynchronisation.ts' */
/** @import { DossierInitializer } from '../../types/database/public/Dossier.ts' */
/** @import { DossierDemarcheSimplifiee88444 } from "../../types/démarche-numérique/DémarcheSimplifiée88444.ts" */

import { json } from "d3-fetch";
import memoize from 'just-memoize'
import { normalisationEmail } from "../../commun/manipulationStrings.js";


/**
 * @typedef {Partial<DossierPourInsertGénérique<Omit<DossierInitializer, 'numéro_démarche'>>>} DonnéesSupplémentairesPourCréationDossier
 */


/**
 * 
 * Type qui définit les messages :
 *              - d'avertissement (où on peut proposer une alternative correcte)
 *              - d'erreurs (où une correction de l'utilisateur.rice est nécessaire)
 * 
 * @typedef {{
 *   type: 'erreur' | 'avertissement';
 *   message: string;
 * }} Alerte
 */

/**
 * @typedef {Partial<
 *   DossierDemarcheSimplifiee88444 & {
 *     alertes: Alerte[];
 *   }
 * >} DossierAvecAlertes
 */

/**
 * Récupère toutes les données de la commune ainsi que celles de son département.
 *
 * @param {string} nomCommune - Nom de la commune.
 * @returns {Promise<{ data: (GeoAPICommune & { departement: GeoAPIDépartement }) | null, alerte?: Alerte }>}
 *
 * @see https://geo.api.gouv.fr/decoupage-administratif/communes
 */
async function getCommuneData(nomCommune) {
    const commune = await json(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomCommune)}&fields=codeDepartement,codeRegion,codesPostaux,population,codeEpci,siren,departement&format=json&geometry=centre`);

    if (!Array.isArray(commune) || commune.length === 0) {
        const messageAlerte = `La commune n'a pas été trouvée par geo.api.gouv.fr. Nom de la commune : ${nomCommune}.`
        console.warn(messageAlerte);
        return {data: null, alerte: {type: 'avertissement', message: messageAlerte}};
    }

    return {data: commune[0]}
}

const memoizedGetCommuneData = memoize(getCommuneData)

export { memoizedGetCommuneData as getCommuneData }

/**
 *
 * @param {string} code
 * @returns {Promise<{ data: GeoAPIDépartement | null, alerte?: Alerte }>}
 * @see {@link https://geo.api.gouv.fr/decoupage-administratif/communes}
 */
async function _getDépartementData(code) {
    const département = await json(`https://geo.api.gouv.fr/departements/${encodeURIComponent(code)}`);

    if (!département) {
        const messageAlerte = `Le département n'a pas été trouvé par geo.api.gouv.fr. Code du département : ${code}.`;
        console.warn(messageAlerte);
        return { data: null, alerte: { type: 'erreur', message: messageAlerte } };
    }
    //@ts-ignore
    return { data: département }
}

/**
 * Extrait un tableau de noms de communes à partir d'une chaîne de caractères.
 * La chaîne peut contenir des noms séparés par des virgules (`,`), des slashes (`/`), ou un mélange des deux.
 * Exemples de valeur en entrée :
 * - Arthonnay, Mélisey, Quincerot, Rugny, Thorey, Trichey et Villon
 * - Argenteuil-sur-Armancon / Moulins-en-Tonnerrois
 * - Mélisey
 *
 * On n'inclut pas le séparateur "-" car beaucoup de villes contiennent des "-"
 *
 * @param {string} valeur - La chaîne contenant une ou plusieurs communes séparées.
 * @returns {string[]} Un tableau contenant les noms des communes nettoyés.
 */
export function extraireCommunes(valeur) {
    if (typeof valeur !== 'string') return [];

    // Utilise une expression régulière pour séparer sur ',' ou '/'
    const communes = valeur.split(/[\/,]/);

    // Nettoie les espaces superflus et filtre les éléments vides
    return communes.map(c => c.trim()).filter(c => c.length > 0);
}




/**
 * Formate une valeur (code ou chaîne) en un ou plusieurs départements reconnus.
 * Renvoie null si pas de département reconnu.
 * @param {string | number} valeur
 * @returns {Promise<{ data: GeoAPIDépartement[] | null, alertes: Alerte[] }>}
 */
async function formaterDépartementDepuisValeur(valeur) {
    /** @type {string[]} */
    let codes = []
    if (typeof valeur === 'number') {
        codes = [valeur.toString()];
    }
    if (typeof valeur === 'string') {
        const blocs = valeur.split('-');
        // Cela permet de récupérer les valeurs comme "21-78"
        for (const bloc of blocs) {
            codes.push(bloc)
        }
    }

    const départementsP = codes.map((code) => _getDépartementData(code))
    /** @type {Alerte[]} */
    const alertes = []

    try {
        const résultats = await Promise.all(départementsP)

        for (const résultat of résultats) {
            if (résultat.alerte) {
                alertes.push(résultat.alerte)
            }
        }

        const départements = résultats
            .map((résultat) => résultat.data)
            .filter((dep) => dep !== null)

        if (départements.length >= 1) {
            // On force le cast car la logique garantit un tableau non vide
            return {
                data: /** @type {[GeoAPIDépartement, ...GeoAPIDépartement[]]} */ (départements),
                alertes
            };
        } else {
            return { data: null, alertes };
        }
    } catch (e) {
        const messageAlerte = `Une erreur ${e} est survenue lors de l'appel de l'API de geo.api.gouv pour le(s) département(s) : ${valeur}.`
        console.warn(messageAlerte)
        alertes.push({ type: 'erreur', message: messageAlerte })
        return { data: null, alertes }
    }
}

const memoizedFormaterDépartementDepuisValeur = memoize(formaterDépartementDepuisValeur)

export { memoizedFormaterDépartementDepuisValeur as formaterDépartementDepuisValeur }

/**
 * Tente d'extraire un prénom et un nom à partir d'une chaîne de texte.
 *
 * @param {string} text Chaîne contenant potentiellement un nom complet
 * @returns {Partial<{prénom: string, nom: string}> | null} Un objet {prénom, nom} si trouvé, sinon null
 *
 * @example
 *   extraireNom("Jean Dupont <jean.dupont@email.fr>") // { prénom: "Jean", nom: "Dupont" }
 */
export function extraireNom(text) {
    const nameRegex = /['"]?([\p{L}'-]+)\s+([\p{L}'-]+)/u;

    const match = nameRegex.exec(text);

    if (match) {
        return { prénom: match[1], nom: match[2] };
    }
    return null;
}

/**
 * Extrait la première adresse mail trouvée dans une chaîne de texte.
 *
 * @param {string} text Chaîne contenant potentiellement une ou plusieurs adresses mail
 * @returns {string|null} La première adresse mail trouvée, ou null si aucune
 *
 * @example
 *   extrairePremierMail("Jean Dupont <jean.dupont@email.fr>") // "jean.dupont@email.fr"
 */
export function extrairePremierMail(text) {
    // Source Regex Mail : https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
    const mailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const résultat = text.match(mailRegex)

    return résultat && résultat?.length ? normalisationEmail(résultat[0]) : null
}

/**
 * Tente d'extraire un prénom et un nom à partir d'une adresse mail.
 *
 * @param {string} mail Adresse mail ou chaîne contenant une adresse mail
 * @returns {Partial<{prénom: string, nom: string}>} Un objet {prénom, nom} si possible, sinon des chaînes vides
 *
 * @example
 *   extraireNomDunMail("jean.dupont@email.fr") // { prénom: "Jean", nom: "Dupont" }
 */
export function extraireNomDunMail(mail) {
    if (!mail.includes('@')) return { prénom: '', nom: '' };

    const localPart = mail.split('@')[0];

    // Séparateurs fréquents
    const parts = localPart.split(/[._\-]/).filter(s => s.length >= 1)


    if (parts.length === 2) {
        const [a, b] = parts;

        // On fait l'hypothèse que la première partie est le prénom.
        return {
            prénom: capitalize(a),
            nom: capitalize(b)
        }
    }


    return {
        prénom: '',
        nom: ''
    };
}

/**
 * Met une majuscule à la première lettre d'une chaîne, le reste en minuscules.
 *
 * @param {string} str Chaîne à capitaliser
 * @returns {string} Chaîne capitalisée
 *
 * @example
 *   capitalize("jean") // "Jean"
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
