//@ts-check

/*
    Dans ce fichier, on s'intéresse spécifiquement à la démarche 88444

    https://www.demarches-simplifiees.fr/admin/procedures/88444
    https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees
    https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees

*/

// Créée à partir du schema https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema
// qui a été copié ici : data/schema-DS-88444.json (et devrait être mis à jour)
/* 

await fetch('https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema')
    .then(r => r.json())
    .then(schema => schema.revision.champDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id])
    ) 

*/

/** @import {DossierDémarcheSimplifiée88444, GeoAPICommune, GeoAPIDépartement} from "../types.js" */

const clefAE = "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"

/** @type {Map< keyof DossierDémarcheSimplifiée88444, string >} */
const démarcheDossierLabelToId = new Map([
    [
        "Le demandeur est…",
        "Q2hhbXAtMzg5ODg5NQ=="
    ],
    [
        "Numéro de SIRET",
        "Q2hhbXAtMzg5NzM5NA=="
    ],
    [
        "Qualification",
        "Q2hhbXAtMzg5NzM1NQ=="
    ],
    [
        "Adresse",
        "Q2hhbXAtMzg5NzM2Mg=="
    ],
    [
        "Objet du projet",
        "Q2hhbXAtMzg5NzQwMA=="
    ],
    [
        "Nom du représentant",
        "Q2hhbXAtMzg5NzM5Nw=="
    ],
    [
        "Prénom du représentant",
        "Q2hhbXAtNDIzMDU1OA=="
    ],
    [
        "Qualité du représentant",
        "Q2hhbXAtMzg5NzM5OA=="
    ],
    [
        "Numéro de téléphone de contact",
        "Q2hhbXAtMzkzMzczNg=="
    ],
    [
        "Adresse mail de contact",
        "Q2hhbXAtMzkzMzc0MA=="
    ],
    [
        clefAE,
        "Q2hhbXAtNDA4MzAxMQ=="
    ],
    [
        "À quelle procédure le projet est-il soumis ?",
        "Q2hhbXAtNDA4Mjk1OA=="
    ],
    [
        "Motif de la dérogation",
        "Q2hhbXAtMzg5NzQwMg=="
    ],
    [
        "Précisez",
        "Q2hhbXAtNDAzMzk0OA=="
    ],
    [
        "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation",
        "Q2hhbXAtNDA0MDgyMQ=="
    ],
    [
        "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet",
        "Q2hhbXAtNDA0MDgyNg=="
    ],
    [
        "Détails du programme d’activité",
        "Q2hhbXAtMzg5NzQwNA=="
    ],
    [
        "Lien vers la liste des espèces concernées",
        "Q2hhbXAtMzg5NzQwNQ=="
    ],
    [
        "Nom du projet",
        "Q2hhbXAtNDE0OTExNQ=="
    ],
    [
        "Cette demande concerne un programme déjà existant",
        "Q2hhbXAtMzkyMzYyNA=="
    ],
    [
        "Dans quel département se localise majoritairement votre projet ?",
        "Q2hhbXAtNDI3NTM5OA=="
    ],
    [
        "Le projet se situe au niveau…",
        "Q2hhbXAtMzg5NzQwOA=="
    ],
    [
        "Commune(s) où se situe le projet",
        "Q2hhbXAtNDA0MTQ0MQ=="
    ],
    [
        "Département(s) où se situe le projet",
        "Q2hhbXAtNDA0MTQ0NQ=="
    ],
    [
        "Région(s) où se situe le projet",
        "Q2hhbXAtNDA0MTQ0OA=="
    ],
    [
        "Date de début d’intervention",
        "Q2hhbXAtMzg5NzQ3NA=="
    ],
    [
        "Date de fin d’intervention",
        "Q2hhbXAtMzkyMzYyNg=="
    ],
    [
        "Date de début de chantier",
        "Q2hhbXAtMzg5NzUwMg=="
    ],
    [
        "Date de fin de chantier",
        "Q2hhbXAtMzkyMzYzMQ=="
    ],
    [
        "Qualification des personnes amenées à intervenir",
        "Q2hhbXAtMzg5NzQ3Ng=="
    ],
    [
        "Modalités techniques de l'intervention",
        "Q2hhbXAtMzg5NzQ5OQ=="
    ],
    [
        "Bilan d'opérations antérieures",
        "Q2hhbXAtMzkyMzY1Ng=="
    ],
    [
        "Description succincte du projet",
        "Q2hhbXAtMzkyMzY2OA=="
    ],
    [
        "Dépot du dossier complet de demande de dérogation",
        "Q2hhbXAtMzkyMzY2OQ=="
    ],
    [
        "Mesures d'évitement, réduction et/ou compensation",
        "Q2hhbXAtMzg5NzUwOQ=="
    ]
])

/**
 * Buggé, mais on sait pas encore pourquoi 
 * Sûrement un bug côté Démarches Simplifiées
 * https://mattermost.incubateur.net/betagouv/pl/tipfbemo1tfymr6qoguggag4gc
 * 
 * @param {GeoAPICommune} _ 
 */
function makeCommuneParam({ code: codeInsee, codesPostaux: [codePostal] }) {
    const communeChamp = `champ_${démarcheDossierLabelToId.get('Commune(s) où se situe le projet')}`
    // Voir https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees
    const communeChampRépété = `champ_Q2hhbXAtNDA0MTQ0Mw`
    const champCommuneRépétéURLParamKey = `${encodeURIComponent(communeChamp)}[][${communeChampRépété}]`

    return `${champCommuneRépétéURLParamKey}=${encodeURIComponent(`["${codePostal}","${codeInsee}"]`)}`
}

/**
 * champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56&champ_Q2hhbXAtNDA0MTQ0NQ[][champ_Q2hhbXAtNDA0MTQ0Nw]=56
 * @param {GeoAPIDépartement} _ 
 */
function makeDépartementParam({code}){
    const départementChamp = `champ_${démarcheDossierLabelToId.get('Département(s) où se situe le projet')}`
    // Voir https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees
    const départementChampRépété = `champ_Q2hhbXAtNDA0MTQ0Nw`

    return `${encodeURIComponent(départementChamp)}[][${départementChampRépété}]=${code}`
}

/** @type {(keyof DossierDémarcheSimplifiée88444)[]} */
const champsPourPréremplissage = [
    "Le demandeur est…",
    "Objet du projet",
    "Nom du représentant",
    "Prénom du représentant",
    "Adresse mail de contact",
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?",
    "Lien vers la liste des espèces concernées",
    "Nom du projet",
    "Le projet se situe au niveau…",
    "Commune(s) où se situe le projet",
    "Département(s) où se situe le projet",
    "Région(s) où se situe le projet"
]

const basePréremplissage = `https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees?`

/**
 * @param {DossierDémarcheSimplifiée88444} dossierPartiel
 */
export function créerLienPréremplissageDémarche(dossierPartiel) {
    /** @type {Record<string, string>} */
    const objetPréremplissage = {};

    for (const champ of champsPourPréremplissage) {
        if (![
            'Commune(s) où se situe le projet',
            'Département(s) où se situe le projet',
            'Région(s) où se situe le projet'
        ].includes(champ)
        ) {

            /** @type {DossierDémarcheSimplifiée88444[keyof DossierDémarcheSimplifiée88444]} */
            const valeur = dossierPartiel[champ]
            if (valeur) {
                // le `champ_` est une convention pour le pré-remplissage de Démarches Simplifiées
                objetPréremplissage[`champ_${démarcheDossierLabelToId.get(champ)}`] = valeur.toString()
            }
        }
    }

    if (!dossierPartiel['Le demandeur est…']) {
        objetPréremplissage[`champ_${démarcheDossierLabelToId.get('Le demandeur est…')}`] = "une personne morale"
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
          .map(makeDépartementParam)
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
            // @ts-expect-error TypeScript ne comprend pas l'effet du filter
            .map(makeCommuneParam)
            .join('&')
        }
    }


    //console.log('objetPréremplissage', objetPréremplissage, dossierPartiel)

    return basePréremplissage +
        (new URLSearchParams(objetPréremplissage)).toString() +
        (communesURLParam ? '&' + communesURLParam : '') +
        (departementsURLParam ? '&' + departementsURLParam : '')

}

