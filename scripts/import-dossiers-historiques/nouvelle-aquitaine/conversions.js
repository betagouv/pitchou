//@ts-check

import { normalizeNomCommune, recoverDate } from "../../commun/typeFormat.js";

/** @import {AnnotationsPrivéesDémarcheSimplifiée88444, DossierDémarcheSimplifiée88444, GeoAPICommune, GeoAPIDépartement, StringValues, DossierComplet, DémarchesSimpliféesCommune} from "../../types.js" */
/** @import {_DossierTableauSuiviNouvelleAquitaine2023, DossierTableauSuiviNouvelleAquitaine2023} from "./types.js" */

/**
 * 
 * @param { StringValues<_DossierTableauSuiviNouvelleAquitaine2023>} dossier 
 * @param { Map<string, GeoAPICommune> } nomToCommune
 * @param { Map<string, GeoAPIDépartement> } stringToDépartement
 * @returns { DossierTableauSuiviNouvelleAquitaine2023 }
 */
export function toDossierTableauSuiviNouvelleAquitaine2023(dossier, nomToCommune, stringToDépartement) {
    /** @type {DossierTableauSuiviNouvelleAquitaine2023} */
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
                const localisationStringValue = String(dossier[key]) || ''

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
                    convertedDossier[key] = localisationStringValue
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
                const DptStringValue = String(dossier[key]) || ''

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
                // @ts-ignore
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

    if(Localisation.length >= 1 && Localisation.every(l => Object(l) === l && l.code && l.nom && !l.codesPostaux)){
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
            if(Array.isArray(communes) && communes.length >= 1){
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
        'Numéro de SIRET': dossier['SIRET'] && String(dossier['SIRET']) || '',
        'Qualification': '',
        'Adresse': '',
        'Objet du projet': typeVersObjet.get(dossier['Type de projet']) || '',
        'Nom du représentant': dossier['Nom contact'] || '',
        'Prénom du représentant': dossier['Prénom contact'] || '',
        'Qualité du représentant': '',
        'Numéro de téléphone de contact': '',
        'Adresse mail de contact': dossier['mail de contact'],
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
 * 
 * @param {Dossier} dossierPitchou 
 * @returns {boolean}
 */
function dossierHasValidLocation(dossierPitchou){
    /** @type {DémarchesSimpliféesCommune[] | undefined} */
    const communes = dossierPitchou.communes

    const validCommunes = Array.isArray(communes) && communes.length >= 1


    
}

/**
 * Convertit un objet du type DossierTableauSuiviNouvelleAquitaine2023 vers AnnotationsPrivéesDémarcheSimplifiée88444.
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossierTableauSuivi 
 * @param {DossierComplet} dossierPitchou 
 * @returns {Partial<AnnotationsPrivéesDémarcheSimplifiée88444>}
 */
export function dossierSuiviNAVersAnnotationsDS88444(dossierTableauSuivi, dossierPitchou) {
    /**
     * @type {Partial<AnnotationsPrivéesDémarcheSimplifiée88444>}
     */
    const annotationsConverties = {
        "Historique - nom porteur": dossierPitchou.demandeur_personne_morale_siret || dossierPitchou.demandeur_personne_physique_nom ? undefined : dossierTableauSuivi['Porteur de projet'],
        "Historique - localisation": dossierHasValidLocation(dossierPitchou) ? undefined : dossierTableauSuivi['Localisation']?.map(cOuD => typeof cOuD === 'string' ? cOuD : cOuD.nom).join(', '),
        'DDEP nécessaire ?': 1,
        'Dossier en attente de': 1,
        'Enjeu écologique': dossierTableauSuivi['enjeu écologique'] === 'oui',
        'Enjeu politique': dossierTableauSuivi['enjeu politique'] === 'oui', 
        'Commentaires sur les enjeux et la procédure': dossierTableauSuivi['commentaires sur les enjeux et le contexte'],
        'Date de réception DDEP': getDateRéception(dossierTableauSuivi),
        'Dernière contribution en lien avec l\'instruction DDEP': '',
        'Date d\'envoi de la dernière contribution en lien avec l\'instruction DDEP': dossierTableauSuivi['Date envoi dernier avis SPN'],
        'Autres documents relatifs au dossier': '',
        'N° Demande ONAGRE': dossierTableauSuivi['N°ONAGRE de demande'],
        'Saisine de l\'instructeur': '',
        'Date saisine CSRPN': dossierTableauSuivi['Date saisine CSRPN'],
        'Date saisine CNPN': dossierTableauSuivi['Date saisine CNPN'],
        'Date avis CSRPN': dossierTableauSuivi['Date avis CNPN / CSRPN'], 
        'Date avis CNPN': dossierTableauSuivi['Date avis CNPN / CSRPN'], 
        'Avis CSRPN/CNPN': '',
        'Avis CSRPN/CNPN fichier': '',
        'Date de début de la consultation du public ou enquête publique': recoverDate(dossierTableauSuivi['Dates consultation public']),
        'Décision': dossierTableauSuivi['Décision'],
        'Date de signature de l\'AP': dossierTableauSuivi['Date arrêté (AP)'],
        'Référence de l\'AP': dossierTableauSuivi['Réf arrêté (AP)'],
        'Date de l\'AM': dossierTableauSuivi['Date AM'],
        'Référence de l\'AM': '',
        'AP/AM': dossierTableauSuivi['Type d\'arrêté']
    };

    return annotationsConverties;
}
