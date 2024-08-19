//@ts-check

import { normalizeNomCommune, recoverDate } from "../../commun/typeFormat.js";

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444, GeoAPICommune, GeoAPIDépartement, StringValues, DossierComplet} from "../../types.js" */
/** @import {_DossierTableauSuiviNouvelleAquitaine2023, DossierTableauSuiviNouvelleAquitaine2023} from "./types.js" */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DémarchesSimpliféesCommune} from "../../types/démarches-simplifiées/api.js" */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from "../../types/database/public/Dossier.ts" */

/**
 * 
 * @param { DossierTableauSuiviNouvelleAquitaine2023} dossier 
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
            case 'Date avis CNPN / CSRPN)':
            case 'Date arrêté (AP)':
            case 'Date AM':
            case 'Date envoi avis SPN n°2':
            case 'Date envoi avis SPN n°3':
            case 'Dates consultation public':
                convertedDossier[key] = recoverDate(dossier[key]);
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

                convertedDossier['Localisation string'] = localisationStringValue

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
 * Convertit un objet du type DossierTableauSuiviNouvelleAquitaine2023 vers DossierDemarcheSimplifiee88444.
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossier 
 * @param {Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDemarcheSimplifiee88444['Objet du projet']>} typeVersObjet 
 * @param { Map<string, GeoAPIDépartement> } stringToDépartement
 * @returns {Partial<DossierDemarcheSimplifiee88444>} 
 */
export function dossierSuiviNAVersDossierDS88444(dossier, typeVersObjet, stringToDépartement) {
    let communes, départements, départementPrincipale;

    const Localisation = dossier['Localisation'] || []
    const Dpt = dossier['Dpt'] || []

    if(
        Localisation.length >= 1 && 
        //@ts-expect-error TS ne comprend pas le check du type avec Object(l) === l
        Localisation.every(l => Object(l) === l && l.code && l.nom && !l.codesPostaux)
    ){
        // il y a un ou des départements dans la colonne 'Localisation'
        /** @type {GeoAPIDépartement[]} */
        départements = (Localisation)
        communes = undefined
        /** @type {GeoAPIDépartement} */
        départementPrincipale = (Dpt[0] || départements[0])
    }
    else{
        // il y a une ou des communes dans la colonne 'Localisation'
        départements = undefined
        /** @type{GeoAPICommune[]} */
        communes = (Localisation)
        if(Dpt[0]){
            /** @type {GeoAPIDépartement} */
            départementPrincipale = (Dpt[0])
        }
        else{
            if(Array.isArray(communes) && communes.length >= 1){
                /** @type {Map<string, number>} */
                const countByCodeDepartement = new Map()

                for(const commune of communes){
                    const codeDepartement = typeof commune === 'object' && commune.codeDepartement
                    if(codeDepartement){
                        const count = countByCodeDepartement.get(codeDepartement) || 0
                        countByCodeDepartement.set(codeDepartement, count + 1) 
                    }
                }

                const maxCount = Math.max(...[...countByCodeDepartement.values()])
                //@ts-expect-error TS ne comprend pas que le find retourne toujours une valeur
                const [codeDépartementPrincipale] = [...countByCodeDepartement].find(([_, count]) => count === maxCount)
                
                /** @type {GeoAPIDépartement} */
                départementPrincipale = (stringToDépartement.get(codeDépartementPrincipale))
            }
        }
    }

    /*if(!départementPrincipale){
        console.warn('Pas de département principale', Localisation, Dpt)
    }*/



    /**
     * @type {Partial<DossierDemarcheSimplifiee88444>}
     */
    const dossierConverti = {
        'Porteur de projet': dossier['Porteur de projet'],
        'Le demandeur est…': "une personne morale",
        'Numéro de SIRET': dossier['SIRET'] && String(dossier['SIRET']) || undefined,
        'Qualification': undefined,
        'Adresse': undefined,
        'Objet du projet': typeVersObjet.get(dossier['Type de projet']) || undefined,
        'Nom du représentant': dossier['Nom contact'] || undefined,
        'Prénom du représentant': dossier['Prénom contact'] || undefined,
        'Qualité du représentant': undefined,
        'Numéro de téléphone de contact': undefined,
        'Adresse mail de contact': dossier['mail de contact'] || undefined,
        'Description de la demande': dossier['But'],
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": dossier['Procédure'] === 'AE avec DDEP' || dossier['Procédure'] === 'AE sans DDEP',
        'À quelle procédure le projet est-il soumis ?': undefined,
        'Motif de la dérogation': undefined,
        'Précisez': undefined,
        "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation": undefined,
        "Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet": undefined,
        'Détails du programme d’activité': undefined,
        'Lien vers la liste des espèces concernées': undefined,
        'Nom du projet': dossier['Nom du projet'],
        'Cette demande concerne un programme déjà existant': false,
        'Le projet se situe au niveau…': undefined,
        'Commune(s) où se situe le projet': communes,
        'Département(s) où se situe le projet': départements,
        'Date de début d’intervention': dossier['Date réception Guichet Unique'],
        'Date de fin d’intervention': undefined,
        'Date de début de chantier': undefined,
        'Date de fin de chantier': undefined,
        'Qualification des personnes amenées à intervenir': undefined,
        "Modalités techniques de l'intervention": undefined,
        "Bilan d'opérations antérieures": undefined,
        'Description succincte du projet': undefined,
        'Dépot du dossier complet de demande de dérogation': undefined,
        "Des mesures ERC sont-elles prévues ?": undefined,
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

/** @type {Map<_DossierTableauSuiviNouvelleAquitaine2023['DDEP requise'], AnnotationsPriveesDemarcheSimplifiee88444['DDEP nécessaire ?']>} */
const DDEPRequiseToDDEPNécessaire = new Map([
    ['oui', 'Oui'],
    ['non', 'Non'],
    ['?', 'A déterminer']
])

/** @type {Map<_DossierTableauSuiviNouvelleAquitaine2023['Attente de'], AnnotationsPriveesDemarcheSimplifiee88444['Dossier en attente de']>} */
const AttenteDeMap = new Map([
    ['DREP', 'Action Instructeur'],
    ['SPN', 'Action Instructeur'],
    ['DDT(M)', 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)'],
    ['Expert', 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)'],
    ['Ministère', 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)'],
    ['Préfecture', 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)'],
    ['Pétitionnaire', 'Action extérieure (CSRPN, CNPN, expert, pétitionnaire, autre service...)'],
])

/**
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossierTableauSuivi 
 * @returns {AnnotationsPriveesDemarcheSimplifiee88444['Décision'] | undefined}
 */
function décision(dossierTableauSuivi){
    const typeArrêté = dossierTableauSuivi[`Type d'arrêté`]
    const dateArrêté = dossierTableauSuivi['Date arrêté (AP)']
    const refArrêté = dossierTableauSuivi['Réf arrêté (AP)']
    const décision = dossierTableauSuivi['Décision']
    
    if(décision === 'Anulation' || décision === 'Refus' || décision === 'Rejet'){
        return 'AP Refus'
    }

    if(décision === "Dérogation" || dateArrêté || refArrêté){
        if(typeArrêté === "Arrêté modificatif"){
            return "AP modificatif"
        }
        else{
            return "AP dérogation"
        }
    }


}

/**
 * Convertit un objet du type DossierTableauSuiviNouvelleAquitaine2023 vers AnnotationsPriveesDemarcheSimplifiee88444.
 * @param {DossierTableauSuiviNouvelleAquitaine2023} dossierTableauSuivi
 * @returns {Partial<AnnotationsPriveesDemarcheSimplifiee88444>}
 */
export function dossierSuiviNAVersAnnotationsDS88444(dossierTableauSuivi) {

    /** @type {AnnotationsPriveesDemarcheSimplifiee88444['Décision'] | undefined} */
    const décisionDossier = décision(dossierTableauSuivi)

    /**
     * @type {Partial<AnnotationsPriveesDemarcheSimplifiee88444>}
     */
    const annotationsConverties = {
        "Nom du porteur de projet": dossierTableauSuivi['Porteur de projet'],
        "Localisation du projet": dossierTableauSuivi['Localisation string'],
        //@ts-ignore
        'DDEP nécessaire ?': DDEPRequiseToDDEPNécessaire.get(dossierTableauSuivi['DDEP requise']),
        //@ts-ignore
        'Dossier en attente de': AttenteDeMap.get(dossierTableauSuivi['Attente de']),
        'Enjeu écologique': typeof dossierTableauSuivi['enjeu écologique'] === 'string' && dossierTableauSuivi['enjeu écologique'].length >= 1 || undefined,
        'Enjeu politique': typeof dossierTableauSuivi['enjeu politique'] === 'string' && dossierTableauSuivi['enjeu politique'].length >= 1 || undefined, 
        'Commentaires sur les enjeux et la procédure': dossierTableauSuivi['commentaires sur les enjeux et le contexte'] || undefined,
        "Commentaires libre sur l'état de l'instruction": dossierTableauSuivi['Remarques internes DREP'],
        'Date de réception DDEP': getDateRéception(dossierTableauSuivi),
        'Dernière contribution en lien avec l\'instruction DDEP': undefined,
        'Date d\'envoi de la dernière contribution en lien avec l\'instruction DDEP': dossierTableauSuivi['Date envoi dernier avis SPN'],
        'Autres documents relatifs au dossier': undefined,
        'N° Demande ONAGRE': dossierTableauSuivi['N°ONAGRE de demande '],
        'Saisine de l\'instructeur': undefined,
        'Date saisine CSRPN': dossierTableauSuivi['Date saisine CSRPN'],
        'Date saisine CNPN': dossierTableauSuivi['Date saisine CNPN'],
        'Date avis CSRPN': dossierTableauSuivi['Date saisine CSRPN'] ? dossierTableauSuivi['Date avis CNPN / CSRPN)'] : undefined, 
        'Date avis CNPN': dossierTableauSuivi['Date saisine CNPN'] ? dossierTableauSuivi['Date avis CNPN / CSRPN)'] : undefined, 
        'Avis CSRPN/CNPN': undefined, // pas dans le tableau de suivi
        'Date de début de la consultation du public ou enquête publique': dossierTableauSuivi['Dates consultation public'],
        'Décision': décisionDossier,
        'Date de signature de l\'AP': décisionDossier === 'AP dérogation' ? dossierTableauSuivi['Date arrêté (AP)'] : undefined,
        'Référence de l\'AP': décisionDossier === 'AP dérogation' ? dossierTableauSuivi['Réf arrêté (AP)'] : undefined,
        
        'Date de l\'AM': dossierTableauSuivi['Date AM'] || décisionDossier === 'AP modificatif' ? dossierTableauSuivi['Date arrêté (AP)'] : undefined,
        'Référence de l\'AM': décisionDossier === 'AP modificatif' ? dossierTableauSuivi['Réf arrêté (AP)'] : undefined,
        
        'AP/AM': undefined
    };

    return annotationsConverties;
}
