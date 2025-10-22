//@ts-check
import {createOdsFile, getODSTableRawContent, tableRawContentToObjects} from '@odfjs/odfjs'

/** @import {
 *    ClassificationEtreVivant,
 *    EspèceProtégée,
 *    ParClassification,
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
 *    ImpactQuantifié,
 * } from "../types/especes.d.ts" */
/** @import {SheetRawContent, SheetRawCellContent} from '@odfjs/odfjs' */
/** @import {FauneNonOiseauAtteinteOds_V1, FichierEspècesImpactéesOds_V1, FloreAtteinteOds_V1, OiseauAtteintOds_V1} from '../types/espècesFichierOds.d.ts' */
/** @import { PitchouState } from '../front-end/store.js' */

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
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'nids', 'œufs', 'surface habitat détruit', 'activité', 'identifiant pitchou activité', 'code activité', 'méthode', 'code méthode', 'transport', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, activité, méthode, transport} of oiseauxAtteints){

        const labelActivité = activité && activité['Libellé Pitchou']
        const identifiantPitchouActivité = activité && activité['Identifiant Pitchou']
        const codeEuropeActivité = activité && activité['Code rapportage européen']
        const labelMéthode = méthode && méthode['Libellé Pitchou']
        const codeMéthode = méthode && méthode.Code
        const labelTransport = transport && transport['Libellé Pitchou']
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit, labelActivité, identifiantPitchouActivité, codeEuropeActivité, labelMéthode, codeMéthode, labelTransport, codeTransport]
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
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'activité', 'identifiant pitchou activité', 'code activité', 'méthode', 'code méthode', 'transport', 'code transport']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité, méthode, transport} of faunesNonOiseauAtteintes){
        const labelActivité = activité && activité['Libellé Pitchou']
        const identifiantPitchouActivité = activité && activité['Identifiant Pitchou']
        const codeEuropeActivité = activité && activité['Code rapportage européen']
        const labelMéthode = méthode && méthode['Libellé Pitchou']
        const codeMéthode = méthode && méthode.Code
        const labelTransport = transport && transport['Libellé Pitchou']
        const codeTransport = transport && transport.Code

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, labelActivité, identifiantPitchouActivité, codeEuropeActivité, labelMéthode, codeMéthode, labelTransport, codeTransport]
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
        ['noms vernaculaires', 'noms scientifique', 'CD_REF', 'nombre individus', 'surface habitat détruit', 'activité', 'identifiant pitchou activité', 'code activité']
        .map(toSheetRawCellContent)
    ]

    for(const {espèce: {nomsScientifiques, nomsVernaculaires, CD_REF}, nombreIndividus, surfaceHabitatDétruit, activité} of floresAtteintes){
        const labelActivité = activité && activité['Libellé Pitchou']
        const identifiantPitchouActivité = activité && activité['Identifiant Pitchou']
        const codeEuropeActivité = activité && activité['Code rapportage européen']

        sheetRawContent.push(
            [[...nomsVernaculaires].join(', '), [...nomsScientifiques].join(', '), CD_REF, nombreIndividus, surfaceHabitatDétruit, labelActivité, identifiantPitchouActivité, codeEuropeActivité]
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
 * @param {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} activites
 * @param {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} methodes
 * @param {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transports
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
                    // @ts-ignore
                    activité: activites[classification].get(activité),
                    méthode: methodes[classification].get(méthode),
                    transport: transports[classification].get(transport),
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
 * @param {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} activites
 * @param {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} methodes
 * @param {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transports
 * @returns {DescriptionMenacesEspèces | undefined}
 */
export function importDescriptionMenacesEspècesFromURL(url, espèceByCD_REF, activites, methodes, transports){
    const urlData = url.searchParams.get('data')
    if(urlData){
        try{
            const data = JSON.parse(b64ToUTF8(urlData))
            const desc = descriptionMenacesEspècesFromJSON(data, espèceByCD_REF, activites, methodes, transports)
            return desc
        }
        catch(e){
            console.error('Parsing error', e, urlData)
            return undefined
        }
    }
}


/**
 *
 * @param {OiseauAtteintOds_V1 | FauneNonOiseauAtteinteOds_V1 | FloreAtteinteOds_V1} espèceImpactée
 * @return {boolean}
 */
function ligneEspèceImpactéeHasCD_REF(espèceImpactée){
    return !!espèceImpactée.CD_REF
}

/**
 * @param {ArrayBuffer} odsFile
 * @param {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} espèceByCD_REF
 * @param {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} activites
 * @param {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} methodes
 * @param {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transports
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
async function importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1(odsFile, espèceByCD_REF, activites, methodes, transports){
    /** @type {DescriptionMenacesEspèces} */
    const descriptionMenacesEspèces = Object.create(null)

    const odsRawContent = await getODSTableRawContent(odsFile)
    /** @type {FichierEspècesImpactéesOds_V1} */
    const odsContent = tableRawContentToObjects(odsRawContent)

    let lignesOiseauOds = odsContent.get('oiseau')
    lignesOiseauOds = lignesOiseauOds && lignesOiseauOds.filter(ligneEspèceImpactéeHasCD_REF)

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
                "code transport": codeTransport,
            } = ligneOiseauOds
            let identifiantPitchouActivité = ligneOiseauOds['identifiant pitchou activité']

            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            //Si aucun identifiant pitchou activité n'a été trouvé pour la ligne, il s'agit d'un fichier espèce avec un format legacy. Dans ce cas, on essaie de "deviner" l'identifiant Pitchou Activité à partir du code activité.
            if (!identifiantPitchouActivité) {
                if (codeActivité === '4') {
                    if ((nombreOeufs && nombreOeufs > 0) || (nombreNids && nombreNids > 0)) {
                        // Destruction de nids/oeufs
                        identifiantPitchouActivité = 'P-4-1'
                    } else {
                        // Dégradation/destruction d’aires de repos/reproduction
                        identifiantPitchouActivité = 'P-4-2'
                    }
                } else if (codeActivité == '2') {
                    // Capture pour captivité temporaire ou définitive
                    identifiantPitchouActivité = 'P-2-1'
                } else {
                    identifiantPitchouActivité = `P-${codeActivité}`
                }
            }

            return {
                espèce,
                nombreIndividus,
                nombreNids,
                nombreOeufs,
                surfaceHabitatDétruit,
                activité: activites['oiseau'].get(identifiantPitchouActivité),
                méthode: methodes['oiseau'].get(codeMéthode),
                transport: transports['oiseau'].get(codeTransport),
            }
        })
    }

    let lignesFauneNonOiseauOds = odsContent.get('faune non-oiseau') || odsContent.get('faune_non-oiseau')
    lignesFauneNonOiseauOds = lignesFauneNonOiseauOds && lignesFauneNonOiseauOds.filter(ligneEspèceImpactéeHasCD_REF)

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
            let identifiantPitchouActivité = ligneFauneNonOiseauOds['identifiant pitchou activité']

            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            if (!identifiantPitchouActivité) {
                if (codeActivité === '70') {
                    // Transport de spécimens vivants ou morts
                    identifiantPitchouActivité = 'P-70-2'
                } else {
                    identifiantPitchouActivité = `P-${codeActivité}`
                }
            }

            return {
                espèce,
                nombreIndividus,
                surfaceHabitatDétruit,
                activité: activites['faune non-oiseau'].get(identifiantPitchouActivité),
                méthode: methodes['faune non-oiseau'].get(codeMéthode),
                transport: transports['faune non-oiseau'].get(codeTransport),
            }
        })
    }

    let lignesFloreOds = odsContent.get('flore')
    lignesFloreOds = lignesFloreOds && lignesFloreOds.filter(ligneEspèceImpactéeHasCD_REF)

    if(lignesFloreOds && lignesFloreOds.length >= 1){
        // recups les infos depuis les colonnes
        descriptionMenacesEspèces['flore'] = lignesFloreOds.map(ligneFloreOds => {
            const {
                CD_REF,
                "nombre individus": nombreIndividus,
                "surface habitat détruit": surfaceHabitatDétruit,
                "code activité": codeActivité,
                "identifiant pitchou activité": identifiantPitchouActivité,
            } = ligneFloreOds

            const espèce = espèceByCD_REF.get(CD_REF)

            if(!espèce){
                throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`)
            }

            return {
                espèce,
                nombreIndividus,
                surfaceHabitatDétruit,
                activité: activites['flore'].get(identifiantPitchouActivité || `P-${codeActivité}`)
            }
        })
    }

    return descriptionMenacesEspèces
}

/**
 * @param {Buffer} odsData
 * @returns {Promise<NonNullable<PitchouState['activitésMéthodesTransports']>> }
 */
export async function construireActivitésMéthodesTransports(odsData) {
    const activitésMéthodesTransportsBruts = await getODSTableRawContent(odsData).then(tableRawContentToObjects)

    // Les lignes sont réassignées dans des nouveaux objets pour qu'ils aient la méthode `Object.prototype.toString`
    // utilisée par Svelte

    /**  @type {ParClassification<ActivitéMenançante[]>} */
    const activitésBrutes = {
        oiseau: activitésMéthodesTransportsBruts.get("Activités oiseau").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
        "faune non-oiseau": activitésMéthodesTransportsBruts.get("Activités faune non oiseau").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
        flore: activitésMéthodesTransportsBruts.get("Activités flore").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
    }

    /** @type { MéthodeMenançante[] } */
    const méthodesBrutes = activitésMéthodesTransportsBruts.get("Méthodes").map(
        // @ts-ignore
        row => Object.assign({}, row)
    )
    /** @type { TransportMenançant[] } */
    const moyensPoursuite = activitésMéthodesTransportsBruts.get("Moyens de poursuite").map(
        // @ts-ignore
        row => Object.assign({}, row)
    )

    const activitésMéthodesTransports = actMetTransArraysToMapBundle(
        activitésBrutes,
        méthodesBrutes,
        moyensPoursuite
    )

    const activitéVersImpactsQuantifiés = new Map(Object.values(activitésMéthodesTransports.activités)
        .flatMap((activités) => {
            return [...activités.entries().map(([code, activité]) => {
                /** @type {ImpactQuantifié[]} */
                const impactsQuantifiés =  [ "Nombre d'individus", "Nids", "Œufs", "Surface habitat détruit (m²)" ]

                const impactsQuantifiésFiltrés = impactsQuantifiés.filter((donnéeSecondaire) => {
                    return activité[donnéeSecondaire] === 'Oui'
                });

                /** @type {[ActivitéMenançante['Identifiant Pitchou'], ImpactQuantifié[]]} */
                const ret = [code, impactsQuantifiésFiltrés]
                return ret
            })]
        }))

    const ret = {
        activitéVersImpactsQuantifiés: activitéVersImpactsQuantifiés,
        ...activitésMéthodesTransports
    }

    return ret
}

/**
 * @param {ParClassification<ActivitéMenançante[]>} activitésBrutes
 * @param {MéthodeMenançante[]} méthodesBrutes
 * @param {TransportMenançant[]} transportsBruts
 *
 * @returns {{
*  activités: ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>,
*  méthodes: ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>,
*  transports: ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>
* }}
*/


export function actMetTransArraysToMapBundle(activitésBrutes, méthodesBrutes, transportsBruts){
    /** @type {ParClassification<Map<ActivitéMenançante['Code rapportage européen'], ActivitéMenançante>>} */
    const activités = {
        oiseau: new Map(),
        "faune non-oiseau": new Map(),
        flore: new Map()
    };

    for (const classification in activitésBrutes) {
        /** @type {ActivitéMenançante[]} */
        // @ts-ignore
        const activitéBruteClassification = activitésBrutes[classification]
        for(const activité of activitéBruteClassification){
            if (activité['Identifiant Pitchou'] === undefined || activité['Identifiant Pitchou'] === ''){
                // ignore empty lines (certainly comments)
                break;
            }

            activité['Code rapportage européen'] = activité['Code rapportage européen'].toString()
            // @ts-ignore
            activités[classification].set(activité['Identifiant Pitchou'], activité)
        }
    }


   /** @type {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} */
   const méthodes = {
       oiseau: new Map(),
       "faune non-oiseau": new Map(),
       flore: new Map()
   };

   for(const methode of méthodesBrutes){
       const classif = methode['Espèces']

       if(!classif.trim() && (methode['Code'] === undefined || methode['Code'] === '')){
           // ignore empty lines (certainly comments)
           break;
       }

       if(!isClassif(classif)){
           throw new TypeError(`Classification d'espèce non reconnue : ${classif}`)
       }

       methode['Code'] = methode['Code'].toString()

       const classifMeth = méthodes[classif]
       Object.freeze(methode)
       classifMeth.set(methode.Code, methode)
       méthodes[classif] = classifMeth
   }

   /** @type {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} */
   const transports = {
       oiseau: new Map(),
       "faune non-oiseau": new Map(),
       flore: new Map()
   };

   for(const transport of transportsBruts){
       const classif = transport['Espèces']

       if(!classif.trim() && (transport['Code'] === undefined || transport['Code'] === '')){
           // ignore empty lines (certainly comments)
           break;
       }

       if(!isClassif(classif)){
           throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`)
       }

       transport['Code'] = transport['Code'].toString()

       const classifTrans = transports[classif]
       Object.freeze(transport)
       classifTrans.set(transport.Code, transport)
       transports[classif] = classifTrans
   }

   return {
       activités,
       méthodes,
       transports
   }
}


export const importDescriptionMenacesEspècesFromOdsArrayBuffer = importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1
