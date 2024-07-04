//@ts-check

import { parse as parseDate } from "date-fns"

/** @import {_DossierTableauSuiviNouvelleAquitaine2023, AnnotationsPrivéesDémarcheSimplifiée88444, DossierDémarcheSimplifiée88444, DossierTableauSuiviNouvelleAquitaine2023, GeoAPICommune, GeoAPIDépartement, StringValues} from "../types.js" */

/**
 * 
 * @param {any} d 
 * @returns {boolean}
 */
function isValidDate(d) {
    return d instanceof Date && !Number.isNaN(d.valueOf());
}

/**
 * 
 * @param {string | undefined} d // peut-être une date
 */
function recoverDate(d){
    if(!d)
        return undefined

    let date = parseDate(d, 'dd/MM/yy', new Date())

    if(!isValidDate(date)){
        date = parseDate(d, 'dd/MM/yyyy', new Date())
    }
    if(!isValidDate(date)){
        date = parseDate(d, 'yyyy', new Date())
    }

    if(isValidDate(date)){
        return date
    }
    else{
        //console.warn(`Date non reconnue (${d})`)
        return undefined
    }
}

/**
 * 
 * @param {string} nomCommune 
 * @returns 
 */
export function normalizeNomCommune(nomCommune) {
    return nomCommune
        .replace(/-|'/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase()
}


/**
 * 
 * @param { StringValues<_DossierTableauSuiviNouvelleAquitaine2023>} dossier 
 * @param { Map<string, GeoAPICommune> } nomToCommune
 * @param { Map<string, GeoAPIDépartement> } stringToDépartement
 * @returns { DossierTableauSuiviNouvelleAquitaine2023 }
 */
export function toDossierTableauSuiviNouvelleAquitaine2023(dossier, nomToCommune, stringToDépartement) {
    /** @type {DossierTableauSuiviNouvelleAquitaine2023} */
    //@ts-expect-error for code simplicity
    const convertedDossier = {...dossier};

    // Conversion champ par champ
    for (const /** @type {NoInfer<keyof _DossierTableauSuiviNouvelleAquitaine2023>} */ key of Object.keys(dossier)) {
        switch (key) {
            case 'Date réception Guichet Unique':
            case 'Date réception DBEC':
            case 'Date envoi dernier avis SPN':
            case 'Date réception DDEP':
            case 'Date saisine CSRPN':
            case 'Date saisine CNPN':
            case 'Date avis CNPN / CSRPN':
            case 'Date arrêté (AP)':
            case 'Date AM':
            case 'Date envoi avis SPN n°2':
            case 'Date envoi avis SPN n°3':
                convertedDossier[key] = recoverDate(dossier[key]);
                break;
            case 'DDEP requise':
                convertedDossier[key] = dossier[key].trim() === 'oui';
                break;
            case 'Localisation': {
                const localisationStringValue = dossier[key] || ''

                // test s'il s'agit d'un ensemble de Département
                const candidatsDépartements = localisationStringValue
                    .split(/,|&|\//)
                    .map(s => s.trim())
                    .filter(s => s.length >= 1)
                    .map(ptetDept => stringToDépartement.get(ptetDept))

                if(candidatsDépartements.length >= 1 && candidatsDépartements.every(d => d === Object(d))){
                    // Départements
                    //@ts-expect-error TypeScript limitation with .every
                    convertedDossier[key] = candidatsDépartements
                }
                else{
                    // Communes
                    convertedDossier[key] = (dossier[key] || '')
                        .split(/,|&|\//)
                        .map(s => s.trim())
                        .filter(s => s.length >= 1)
                        .map(nomCommune => {
                            const normalizedNomCommune = normalizeNomCommune(nomCommune)
                            return nomToCommune.get(normalizedNomCommune) || nomCommune
                        })
                }
                break;
            }
            case 'Dpt': {
                const DptStringValue = dossier[key] || ''

                // test s'il s'agit d'un ensemble de Département
                const candidatsDépartements = DptStringValue
                    .split(/,|&|\//)
                    .map(s => s.trim())
                    .filter(s => s.length >= 1)
                    .map(ptetDept => stringToDépartement.get(ptetDept) || ptetDept)

                convertedDossier[key] = candidatsDépartements
                
                break;
            }
            default:
                convertedDossier[key] = dossier[key];
                break;
        }
    }

    return convertedDossier;
}





/**
 * Convertit un objet du type DossierTableauSuiviNouvelleAquitaine2023 vers DossierDémarcheSimplifiée88444.
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossier 
 * @param {Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDémarcheSimplifiée88444['Objet du projet']>} typeVersObjet 
 * @param { Map<string, GeoAPIDépartement> } stringToDépartement
 * @returns {DossierDémarcheSimplifiée88444} 
 */
export function dossierSuiviNAVersDossierDS88444(dossier, typeVersObjet, stringToDépartement) {
    let communes, départements, départementPrincipale;

    const Localisation = dossier['Localisation'] || []
    const Dpt = dossier['Dpt'] || []

    if(Localisation.every(l => Object(l) === l && l.code && l.nom && !l.codesPostaux)){
        // il y a un ou des départements dans la colonne 'Localisation'
        départements = Localisation
        communes = undefined
        départementPrincipale = Dpt[0] || départements[0]
    }
    else{
        // il y a une ou des communes dans la colonne 'Localisation'
        départements = undefined
        communes = Localisation
        if(Dpt[0]){
            départementPrincipale = Dpt[0]
        }
        else{
            const countByCodeDepartement = new Map()

            for(const commune of communes){
                const codeDepartement = typeof commune === 'object' && commune.codeDepartement
                if(codeDepartement){
                    const count = countByCodeDepartement.get(codeDepartement) || 0
                    countByCodeDepartement.set(codeDepartement, count + 1) 
                }
            }

            const maxCount = Math.max(...[...countByCodeDepartement.values()])
            const [codeDépartementPrincipale] = [...countByCodeDepartement].find(([_, count]) => count === maxCount)
            départementPrincipale = stringToDépartement.get(codeDépartementPrincipale)
        }
    }

    /*if(!départementPrincipale){
        console.warn('Pas de département principale', Localisation, Dpt)
    }*/



    /**
     * @type {DossierDémarcheSimplifiée88444}
     */
    const dossierConverti = {
        'Porteur de projet': dossier['Porteur de projet'],
        'Le demandeur est…': '',
        'Numéro de SIRET': '', // Peut-être laisser vide si non fourni dans le premier objet
        'Qualification': '', // Peut-être laisser vide si non fourni dans le premier objet
        'Adresse': '', // Peut-être laisser vide si non fourni dans le premier objet
        'Objet du projet': typeVersObjet.get(dossier['Type de projet']),
        'Nom du représentant': '',
        'Prénom du représentant': '',
        'Qualité du représentant': '',
        'Numéro de téléphone de contact': '',
        'Adresse mail de contact': '',
        'Description de la demande': dossier['But'],
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": dossier['Procédure'] === 'AE avec DDEP' || dossier['Procédure'] === 'AE sans DDEP',
        'À quelle procédure le projet est-il soumis ?': [],
        'Motif de la dérogation': '',
        'Précisez': '',
        "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation": undefined,
        "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet": '',
        'Détails du programme d’activité': '',
        'Lien vers la liste des espèces concernées': '',
        'Nom du projet': dossier['Nom du projet'],
        'Cette demande concerne un programme déjà existant': false,
        'Le projet se situe au niveau…': undefined,
        'Commune(s) où se situe le projet': communes,
        'Département(s) où se situe le projet': départements,
        'Date de début d’intervention': dossier['Date réception Guichet Unique'],
        'Date de fin d’intervention': undefined,
        'Date de début de chantier': undefined,
        'Date de fin de chantier': undefined,
        'Qualification des personnes amenées à intervenir': [],
        "Modalités techniques de l'intervention": '',
        "Bilan d'opérations antérieures": '',
        'Description succincte du projet': '',
        'Dépot du dossier complet de demande de dérogation': '',
        "Mesures d'évitement, réduction et/ou compensation": undefined,
        "Dans quel département se localise majoritairement votre projet ?": départementPrincipale
    };

    return dossierConverti;
}

/**
 * 
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossier
 */
function getDateRéception(dossier){
    const colonneDateRéceptionDDEP = dossier['Date réception DDEP']
    const colonneDateRéceptionDBEC = dossier['Date réception DBEC']

    const dateRéception = colonneDateRéceptionDDEP || colonneDateRéceptionDBEC;

    return dateRéception
}

/**
 * Convertit un objet du type DossierTableauSuiviNouvelleAquitaine2023 vers AnnotationsPrivéesDémarcheSimplifiée88444.
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossier 
 * @returns {AnnotationsPrivéesDémarcheSimplifiée88444} 
 */
export function dossierSuiviNAVersAnnotationsDS88444(dossier) {
    /**
     * @type {AnnotationsPrivéesDémarcheSimplifiée88444}
     */
    const annotationsConverties = {
        'Enjeu écologique': dossier['enjeu écologique'] === 'oui',
        'Enjeu politique': dossier['enjeu politique'] === 'oui', 
        'Commentaires sur les enjeux et la procédure': dossier['commentaires sur les enjeux et le contexte'],
        'Date de réception DDEP': getDateRéception(dossier),
        'Dernière contribution en lien avec l\'instruction DDEP': '',
        'Date d\'envoi de la dernière contribution en lien avec l\'instruction DDEP': dossier['Date envoi dernier avis SPN'],
        'Autres documents relatifs au dossier': '',
        'N° Demande ONAGRE': dossier['N°ONAGRE de demande'],
        'Saisine de l\'instructeur': '',
        'Date saisine CSRPN': dossier['Date saisine CSRPN'],
        'Date saisine CNPN': dossier['Date saisine CNPN'],
        'Date avis CSRPN': dossier['Date avis CNPN / CSRPN'], 
        'Date avis CNPN': dossier['Date avis CNPN / CSRPN'], 
        'Avis CSRPN/CNPN': '',
        'Avis CSRPN/CNPN fichier': '',
        'Date de début de la consultation du public ou enquête publique': recoverDate(dossier['Dates consultation public']),
        'Décision': dossier['Décision'],
        'Date de signature de l\'AP': dossier['Date arrêté (AP)'],
        'Référence de l\'AP': dossier['Réf arrêté (AP)'],
        'Date de l\'AM': dossier['Date AM'],
        'Référence de l\'AM': '',
        'AP/AM': dossier['Type d\'arrêté']
    };

    return annotationsConverties;
}
