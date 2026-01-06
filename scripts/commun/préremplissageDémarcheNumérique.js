//@ts-check

/*
    Dans ce fichier, on s'intéresse spécifiquement à la démarche 88444

    https://demarche.numerique.gouv.fr/admin/procedures/88444
    https://demarche.numerique.gouv.fr/commencer/derogation-especes-protegees
    https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees

*/

// Créée à partir du schema https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees/schema
// qui a été copié ici : data/schema-DS-88444.json (et devrait être mis à jour)
/* 

await fetch('https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees/schema')
    .then(r => r.json())
    .then(schema => schema.revision.champDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id])
    ) 

*/

/** @import {GeoAPICommune, GeoAPIDépartement} from "../types/GeoAPI.ts" */
/** @import {DossierDemarcheNumerique88444} from "../types/démarche-numérique/Démarche88444.js" */
/** @import {SchemaDémarcheSimplifiée} from '../types/démarche-numérique/schema.js' */

/** @type {keyof DossierDemarcheNumerique88444} */
export const clefAE = "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"

/**
 * 
 * @param {SchemaDémarcheSimplifiée} schema 
 * @returns {Map< keyof DossierDemarcheNumerique88444, string >}
 */
export function schemaToChampLabelToChampId(schema){
    //@ts-expect-error les labels du schema sont les clefs de DossierDemarcheNumerique88444 et TS ne peut pas le comprendre
    return new Map(schema.revision.champDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id]))
}

/**
 * Buggé, mais on sait pas encore pourquoi 
 * Sûrement un bug côté Démarche Numérique
 * https://mattermost.incubateur.net/betagouv/pl/tipfbemo1tfymr6qoguggag4gc
 * 
 * @param {GeoAPICommune} _ 
 * @param {Map< keyof DossierDemarcheNumerique88444, string >} démarcheDossierLabelToId 
 */
function makeCommuneParam({ code: codeInsee, codesPostaux: [codePostal] }, démarcheDossierLabelToId) {
    const communeChamp = `champ_${démarcheDossierLabelToId.get('Commune(s) où se situe le projet')}`
    // Voir https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees
    const communeChampRépété = `champ_Q2hhbXAtNDA0MTQ0Mw`
    const champCommuneRépétéURLParamKey = `${encodeURIComponent(communeChamp)}[][${communeChampRépété}]`

    return `${champCommuneRépétéURLParamKey}=${encodeURIComponent(`["${codePostal}","${codeInsee}"]`)}`
}

/**
 * champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56&champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56
 * @param {GeoAPIDépartement} _ 
 * @param {Map< keyof DossierDemarcheNumerique88444, string >} démarcheDossierLabelToId 
 */
function makeDépartementParam({code}, démarcheDossierLabelToId){
    const départementChamp = `champ_${démarcheDossierLabelToId.get('Département(s) où se situe le projet')}`
    // Voir https://demarche.numerique.gouv.fr/preremplir/derogation-especes-protegees
    const départementChampRépété = `champ_Q2hhbXAtNDA0MTQ0Nw`

    return `${encodeURIComponent(départementChamp)}[][${départementChampRépété}]=${code}`
}

const basePréremplissage = `https://demarche.numerique.gouv.fr/commencer/derogation-especes-protegees?`

/**
 * Démarche numérique propose 2 méthodes pour créer des liens de pré-remplissage : via GET ou POST
 * Cette fonction créé un lien GET
 * 
 * @param {Partial<DossierDemarcheNumerique88444>} dossierPartiel
 * @param {SchemaDémarcheSimplifiée} schema88444
 * @returns {string}
 */
export function créerLienGETPréremplissageDémarche(dossierPartiel, schema88444) {
    const démarcheDossierLabelToId = schemaToChampLabelToChampId(schema88444)

    /** @type {Record<string, string>} */
    const objetPréremplissage = {};

    for (const champ of démarcheDossierLabelToId.keys()) {
        if (![
            'Commune(s) où se situe le projet',
            'Département(s) où se situe le projet',
            'Région(s) où se situe le projet'
        ].includes(champ)
        ) {

            /** @type {DossierDemarcheNumerique88444[keyof DossierDemarcheNumerique88444] | undefined} */
            const valeur = dossierPartiel[champ]
            if (valeur !== undefined && valeur !== null && valeur !== "") {
                // le `champ_` est une convention pour le pré-remplissage de Démarche Numérique
                objetPréremplissage[`champ_${démarcheDossierLabelToId.get(champ)}`] = valeur.toString()
            }
        }
    }

    if (dossierPartiel['Numéro de SIRET']) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Numéro de SIRET')}`] = dossierPartiel['Numéro de SIRET']
    }

    if (typeof dossierPartiel[clefAE] === 'boolean') {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get(clefAE)}`] =
            dossierPartiel[clefAE] ? 'true' : 'false'
    }

    if (dossierPartiel['Dans quel département se localise majoritairement votre projet ?']) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Dans quel département se localise majoritairement votre projet ?')}`] =
            dossierPartiel['Dans quel département se localise majoritairement votre projet ?'].code
    }

    let departementsURLParam = ''
    let communesURLParam = ''

    // recups les départements
    if (Array.isArray(dossierPartiel['Département(s) où se situe le projet']) && dossierPartiel['Département(s) où se situe le projet'].length >= 1) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le projet se situe au niveau…')}`] = "d'un ou plusieurs départements"
        // Un tableau de dictionnaires avec les valeurs possibles pour chaque champ de la répétition.
        // champ_Q2hhbXAtNDA0MTQ0Nw: Un numéro de département   

        departementsURLParam = dossierPartiel['Département(s) où se situe le projet']
          .filter(commune => Object(commune) === commune)
          .map(d => makeDépartementParam(d, démarcheDossierLabelToId))
          .join('&')
    }
    else{
        // recups les communes
        if (Array.isArray(dossierPartiel['Commune(s) où se situe le projet']) && dossierPartiel['Commune(s) où se situe le projet'].length >= 1) {
            // Un tableau de dictionnaires avec les valeurs possibles pour chaque champ de la répétition.
            // champ_Q2hhbXAtNDA0MTQ0Mw: Un tableau contenant le code postal et le code INSEE de la commune

            objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le projet se situe au niveau…')}`] = "d'une ou plusieurs communes"

            communesURLParam = dossierPartiel['Commune(s) où se situe le projet']
            .filter(commune => Object(commune) === commune)
            //@ts-expect-error TS ne comprend pas qu'on n'a gardé que les objets après le filter
            .map(c => makeCommuneParam(c, démarcheDossierLabelToId))
            .join('&')
        }
    }


    //console.log('objetPréremplissage', objetPréremplissage, dossierPartiel)

    return basePréremplissage +
        (new URLSearchParams(objetPréremplissage)).toString() +
        (communesURLParam ? '&' + communesURLParam : '') +
        (departementsURLParam ? '&' + departementsURLParam : '')

}

