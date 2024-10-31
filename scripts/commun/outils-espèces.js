//@ts-check
import {createOdsFile, getODSTableRawContent, tableRawContentToObjects} from 'ods-xlsx'

/** @import {
 *    ClassificationEtreVivant, 
 *    EspèceProtégée, 
 *    EspèceProtégéeStrings,
 *    TAXREF_ROW, 
 *    OiseauAtteint,
 *    FloreAtteinte,
 *    FauneNonOiseauAtteinte,
 *    DescriptionMenacesEspèces,
 *    DescriptionMenaceEspèceJSON,
 *    ActivitéMenançante, 
 *    MéthodeMenançante, 
 *    TransportMenançant,
 * } from "../types/especes.d.ts" */
/** @import {SheetRawContent, SheetRawCellContent} from 'ods-xlsx' */
/** @import {FichierEspècesMenacéesOds_V1} from '../types/espècesFichierOds.d.ts' */

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
    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'nids', 'œufs', 'surface habitat détruit', 'activité', 'code activité', 'méthode', 'code méthode', 'transport', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, activité, méthode, transport} of oiseauxAtteints){
        
        const labelActivité = activité && activité['étiquette affichée']
        const codeActivité = activité && activité.Code
        const labelMéthode = méthode && méthode['étiquette affichée']
        const codeMéthode = méthode && méthode.Code
        const labelTransport = transport && transport['étiquette affichée']
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, labelActivité, codeActivité, labelMéthode, codeMéthode, labelTransport, codeTransport]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
}


/**
 * 
 * @param {FauneNonOiseauAtteinte[]} faunesNonOiseauAtteintes
 * @returns {SheetRawContent}
 */
function faunesNonOiseauAtteintesToTableContent(faunesNonOiseauAtteintes){
    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'activité', 'code activité', 'méthode', 'code méthode', 'transport', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité, méthode, transport} of faunesNonOiseauAtteintes){
        const labelActivité = activité && activité['étiquette affichée']
        const codeActivité = activité && activité.Code
        const labelMéthode = méthode && méthode['étiquette affichée']
        const codeMéthode = méthode && méthode.Code
        const labelTransport = transport && transport['étiquette affichée']
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, labelActivité, codeActivité, labelMéthode, codeMéthode, labelTransport, codeTransport]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
}


/**
 * 
 * @param {FloreAtteinte[]} floresAtteintes
 * @returns {SheetRawContent}
 */
function floresAtteintesToTableContent(floresAtteintes){

    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'activité', 'code activité']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité} of floresAtteintes){
        const labelActivité = activité && activité['étiquette affichée']
        const codeActivité = activité && activité.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, labelActivité, codeActivité]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
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
    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'nids', 'œufs', 'surface habitat détruit', 'code activité', 'code méthode', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, activité, méthode, transport} of oiseauxAtteints){
        const codeActivité = activité && activité.Code
        const codeMéthode = méthode && méthode.Code
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, codeActivité, codeMéthode, codeTransport]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
}


/**
 * 
 * @param {FauneNonOiseauAtteinte[]} faunesNonOiseauAtteintes
 * @returns {SheetRawContent}
 */
function faunesNonOiseauAtteintesToTableContent(faunesNonOiseauAtteintes){
    const sheetRawContent = [
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'code activité', 'code méthode', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité, méthode, transport} of faunesNonOiseauAtteintes){
        const codeActivité = activité && activité.Code
        const codeMéthode = méthode && méthode.Code
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, codeActivité, codeMéthode, codeTransport]
            .map(toSheetRawCellContent)
        )
    }


    return sheetRawContent
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

    odsContent.set('metadata', [
        ['version fichier', 'version TaxRef', 'schema rapportage européen']
        .map(toSheetRawCellContent),
        ['1.0.0', '17.0', 'http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd']
        .map(toSheetRawCellContent),
    ])

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
function descriptionMenacesEspècesFromJSON(descriptionMenacesEspècesJSON, espèceByCD_REF, activites, methodes, transports){
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

/**
 * @param {ArrayBuffer} odsFile
 * @param {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} espèceByCD_REF
 * @param {ActivitéMenançante[]} activites
 * @param {MéthodeMenançante[]} methodes
 * @param {TransportMenançant[]} transports
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
async function importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1(odsFile, espèceByCD_REF, activites, methodes, transports){
    /** @type {DescriptionMenacesEspèces} */
    const descriptionMenacesEspèces = Object.create(null)

    const odsRawContent = await getODSTableRawContent(odsFile)
    /** @type {FichierEspècesMenacéesOds_V1} */
    const odsContent = tableRawContentToObjects(odsRawContent)

    const lignesOiseauOds = odsContent.get('oiseau')
    if(lignesOiseauOds && lignesOiseauOds.length >= 1){
        // recups les infos depuis les colonnes
        descriptionMenacesEspèces['oiseau'] = lignesOiseauOds.map(ligneOiseauOds => {
            const {
                CD_REF,
                "nombre individus": nombreIndividus,
                nids: nombreNids,
                œufs: nombreOeufs,
                "surface habitat détruit": surfaceHabitatDétruit,
                "code activité": codeActivité,
                "code méthode": codeMéthode,
                "code transport": codeTransport
            } = ligneOiseauOds
            
            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            return {
                espèce,
                nombreIndividus,
                nombreNids,
                nombreOeufs,
                surfaceHabitatDétruit,
                activité: activites.find((a) => a.Code === codeActivité),
                méthode: methodes.find((m) => m.Code === codeMéthode),	
                transport: transports.find((t) => t.Espèces === 'oiseau' && t.Code === codeTransport),
                
            }
        })
    }

    const lignesFauneNonOiseauOds = odsContent.get('faune non-oiseau')
    if(lignesFauneNonOiseauOds && lignesFauneNonOiseauOds.length >= 1){
        // recups les infos depuis les colonnes
        descriptionMenacesEspèces['faune non-oiseau'] = lignesFauneNonOiseauOds.map(ligneFauneNonOiseauOds => {
            const {
                CD_REF,
                "nombre individus": nombreIndividus,
                "surface habitat détruit": surfaceHabitatDétruit,
                "code activité": codeActivité,
                "code méthode": codeMéthode,
                "code transport": codeTransport
            } = ligneFauneNonOiseauOds
            
            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            return {
                espèce,
                nombreIndividus,
                surfaceHabitatDétruit,
                activité: activites.find((a) => a.Code === codeActivité),
                méthode: methodes.find((m) => m.Code === codeMéthode),	
                transport: transports.find((t) => t.Espèces === 'faune non-oiseau' && t.Code === codeTransport),
            }
        })
    }

    const lignesFloreOds = odsContent.get('flore')
    if(lignesFloreOds && lignesFloreOds.length >= 1){
        // recups les infos depuis les colonnes
        descriptionMenacesEspèces['flore'] = lignesFloreOds.map(ligneFloreOds => {
            const {
                CD_REF,
                "nombre individus": nombreIndividus,
                "surface habitat détruit": surfaceHabitatDétruit,
                "code activité": codeActivité,
            } = ligneFloreOds
            
            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            return {
                espèce,
                nombreIndividus,
                surfaceHabitatDétruit,
                activité: activites.find((a) => a.Code === codeActivité)
            }
        })
    }



    return descriptionMenacesEspèces
}



export const importDescriptionMenacesEspècesFromOdsArrayBuffer = importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1