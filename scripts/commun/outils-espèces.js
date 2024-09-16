//@ts-check

import { isOiseauAtteint, isFauneNonOiseauAtteinte, isFloreAtteinte } from '../types/typeguards.js'

/** @import {
 *    ClassificationEtreVivant, 
 *    EspèceProtégée, 
 *    EspèceProtégéeStrings,
 *    TAXREF_ROW, 
 *    OiseauAtteint,
 *    FloreAtteinte,
 *    FauneNonOiseauAtteinte,
 *    OiseauAtteintJSON, 
 *    FloreAtteinteJSON,
 *    FauneNonOiseauAtteinteJSON,
 *    DescriptionMenacesEspèces,
 *    DescriptionMenacesEspècesJSON,
 *    ActivitéMenançante, 
 *    MéthodeMenançante, 
 *    TransportMenançant,
 * } from "../types/especes.d.ts" */


/** @type {Set<'oiseau' | 'faune non-oiseau' | 'flore'>} */
const classificationEtreVivants = new Set(["oiseau", "faune non-oiseau", "flore"])

/**
 * @param {string} x 
 * @returns {x is ClassificationEtreVivant}
 */
export function isClassif(x){
    // @ts-ignore
    return classificationEtreVivants.has(x)
}


/**
 * 
 * @param {TAXREF_ROW} _ 
 * @returns {ClassificationEtreVivant}
 */
export function TAXREF_ROWClassification({REGNE, CLASSE}){
    if(REGNE === 'Plantae' || REGNE ===  'Fungi' || REGNE === 'Chromista'){
        return 'flore'
    }

    if(REGNE === 'Animalia'){
        if(CLASSE === 'Aves'){
            return 'oiseau'
        }
        else{
            return 'faune non-oiseau'
        }
    }

    throw new TypeError(`Classification non reconnue pour REGNE ${REGNE} et CLASSE ${CLASSE}`)
}

/**
 * 
 * @param {TAXREF_ROW['NOM_VERN']} NOM_VERN 
 * @returns {string[]}
 */
export function nomsVernaculaires(NOM_VERN){
    if(NOM_VERN === '')
        return []
    return NOM_VERN.split(',').map(n => n.trim())
}

/**
 * 
 * @param {EspèceProtégéeStrings} _ 
 * @returns {EspèceProtégée}
 */
export function espèceProtégéeStringToEspèceProtégée({CD_REF, CD_TYPE_STATUTS, classification, nomsScientifiques, nomsVernaculaires}){
    if(!isClassif(classification)){
        throw new TypeError(`Classification d'espèce non reconnue: ${classification}. Les choix sont : ${[...classificationEtreVivants].join(', ')}`)
    }

    return {
        CD_REF,
        //@ts-ignore trusting data generation
        CD_TYPE_STATUTS: new Set(CD_TYPE_STATUTS.split(',')), 
        //@ts-ignore trusting data generation
        classification,
        nomsScientifiques: new Set(nomsScientifiques.split(',')),
        nomsVernaculaires: new Set(nomsVernaculaires.split(',')), 
    }
}


/**
 * 
 * @param { OiseauAtteint|FauneNonOiseauAtteinte|FloreAtteinte} etreVivantAtteint
 * @returns { OiseauAtteintJSON|FauneNonOiseauAtteinteJSON|FloreAtteinteJSON }
 */
function etreVivantAtteintToJSON(etreVivantAtteint){
    const etreVivantAtteintJSON = {
        espèce: etreVivantAtteint.espèce['CD_REF'],
        activité: etreVivantAtteint.activité && etreVivantAtteint.activité.Code, 
        nombreIndividus: etreVivantAtteint.nombreIndividus,
        surfaceHabitatDétruit: etreVivantAtteint.surfaceHabitatDétruit,
    }

    if(isOiseauAtteint(etreVivantAtteint)){
        return Object.assign(etreVivantAtteintJSON, {  
            méthode: etreVivantAtteint.méthode && etreVivantAtteint.méthode.Code, 
            transport: etreVivantAtteint.transport && etreVivantAtteint.transport.Code,
            nombreIndividus: etreVivantAtteint.nombreIndividus,
            nombreNids: etreVivantAtteint.nombreNids,
            nombreOeufs: etreVivantAtteint.nombreOeufs,
        })
    }
    else if(isFauneNonOiseauAtteinte(etreVivantAtteint)) {
        return Object.assign(etreVivantAtteintJSON, { 
            méthode: etreVivantAtteint.méthode && etreVivantAtteint.méthode.Code, 
            transport: etreVivantAtteint.transport && etreVivantAtteint.transport.Code,
            nombreIndividus: etreVivantAtteint.nombreIndividus,
        })
    } 
    else if(isFloreAtteinte(etreVivantAtteint)) {
        return etreVivantAtteintJSON
    }
    
    throw new TypeError("etreVivantAtteint n'est ni un oiseau, ni une faune non-oiseau, ni une flore")
}

/**
 * 
 * @param { DescriptionMenacesEspèces } descriptionMenacesEspèces
 * @returns { DescriptionMenacesEspècesJSON }
 */
export function descriptionMenacesEspècesToJSON(descriptionMenacesEspèces){
    console.log(descriptionMenacesEspèces)
    // @ts-ignore
    return Object.keys(descriptionMenacesEspèces).map((/** @type {ClassificationEtreVivant} */ classification) => {
        return {
            classification, 
            etresVivantsAtteints: descriptionMenacesEspèces[classification].map(etreVivantAtteintToJSON), 
            
        }
    })
}

/**
 * @param {DescriptionMenacesEspècesJSON} descriptionMenacesEspècesJSON
 * @param {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} espèceByCD_REF
 * @param {ActivitéMenançante[]} activites
 * @param {MéthodeMenançante[]} methodes
 * @param {TransportMenançant[]} transports
 * @returns {DescriptionMenacesEspèces}
 */
export function descriptionMenacesEspècesFromJSON(descriptionMenacesEspècesJSON, espèceByCD_REF, activites, methodes, transports){
    /** @type {DescriptionMenacesEspèces} */
    const descriptionMenacesEspèces = Object.create(null)

    descriptionMenacesEspècesJSON.forEach(({classification, etresVivantsAtteints}) => {
        //@ts-ignore
        descriptionMenacesEspèces[classification] = 
            //@ts-ignore
            etresVivantsAtteints.map(({espèce, espece, activité, méthode, transport, ...rest}) => {
                //@ts-expect-error TS ne comprend pas que si `espèce` n'est pas 
                // renseigné alors `espece` l'est forcément
                const espèceParamDéprécié = espèceByCD_REF.get(espece)

                return {
                    espèce: espèceByCD_REF.get(espèce) || espèceParamDéprécié,
                    activité: activites.find((a) => a.Code === activité),
                    méthode: methodes.find((m) => m.Code === méthode),	
                    transport: transports.find((t) => t.Espèces === classification && t.Code === transport),
                    ...rest
                }
            })
    })

    return descriptionMenacesEspèces
}