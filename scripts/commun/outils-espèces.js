//@ts-check
import {createOdsFile} from 'ods-xlsx'

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
 *    DescriptionMenaceEspèceJSON,
 *    ActivitéMenançante, 
 *    MéthodeMenançante, 
 *    TransportMenançant,
 * } from "../types/especes.d.ts" */
/** @import {SheetRawContent, SheetRawCellContent} from 'ods-xlsx' */


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
 * @param {undefined | null | number | string | boolean} x 
 * @returns {SheetRawCellContent}
 */
function toSheetRawCellContent(x){
    if(x === undefined || x === null || Number.isNaN(x))
        return {type: 'string', value: ''}

    if(typeof x === 'number')
        return {type: 'float', value: x}
    
    if(typeof x === 'string')
        return {type: 'string', value: x}
    
    
    return {type: 'string', value: String(x)}
}

/**
 * 
 * @param {OiseauAtteint[]} oiseauxAtteints 
 * @returns {SheetRawContent}
 */
function oiseauxAtteintsToTableContent(oiseauxAtteints){
    return []
}


/**
 * 
 * @param {FauneNonOiseauAtteinte[]} faunesNonOiseauAtteintes
 * @returns {SheetRawContent}
 */
function faunesNonOiseauAtteintesToTableContent(faunesNonOiseauAtteintes){
    return []
}


/**
 * 
 * @param {FloreAtteinte[]} floresAtteintes
 * @returns {SheetRawContent}
 */
function floresAtteintesToTableContent(floresAtteintes){

    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'code activité']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité} of floresAtteintes){
        const codeActivité = activité && activité.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, codeActivité]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
}


/**
 * 
 * @param { DescriptionMenacesEspèces } descriptionMenacesEspèces
 * @returns { Promise<ArrayBuffer> }
 */
export function descriptionMenacesEspècesToOdsArrayBuffer(descriptionMenacesEspèces){
    console.log(descriptionMenacesEspèces)

    const odsContent = new Map()

    if(descriptionMenacesEspèces['oiseau'].length >= 1){
        odsContent.set('oiseau', oiseauxAtteintsToTableContent(descriptionMenacesEspèces['oiseau']))
    }

    if(descriptionMenacesEspèces['faune non-oiseau'].length >= 1){
        odsContent.set('faune non-oiseau', faunesNonOiseauAtteintesToTableContent(descriptionMenacesEspèces['faune non-oiseau']))
    }

    if(descriptionMenacesEspèces['flore'].length >= 1){
        odsContent.set('flore', floresAtteintesToTableContent(descriptionMenacesEspèces['flore']))
    }

    /*odsContent.set('metadata', [
        'version fichier', 'version Taxref'
    ])*/

    return createOdsFile(odsContent)
}


/**
 * @param {DescriptionMenaceEspèceJSON[]} descriptionMenacesEspècesJSON
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

/**
 *
 * @param {string} s // utf-8-encoded base64 string
 * @returns {string} // cleartext string
 */
function b64ToUTF8(s) {
    return decodeURIComponent(escape(atob(s)))
}

/**
 * 
 * @param {URL} url 
 * @param {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} espèceByCD_REF
 * @param {ActivitéMenançante[]} activites
 * @param {MéthodeMenançante[]} methodes
 * @param {TransportMenançant[]} transports
 * @returns {DescriptionMenacesEspèces | undefined}
 */
export function importDescriptionMenacesEspècesFromURL(url, espèceByCD_REF, activites, methodes, transports){
    const urlData = url.searchParams.get('data')
    if(urlData){
        try{
            const data = JSON.parse(b64ToUTF8(urlData))
            const desc = descriptionMenacesEspècesFromJSON(data, espèceByCD_REF, activites, methodes, transports)
            console.log('desc', desc)
            return desc
        }
        catch(e){
            console.error('Parsing error', e, urlData)
            return undefined
        }
    }
}