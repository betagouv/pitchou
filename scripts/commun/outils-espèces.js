//@ts-check

import { isOiseauAtteint, isFauneNonOiseauAtteinte, isFloreAtteinte } from '../types/typeguards.js'

/** @import {
 *    ClassificationEtreVivant, 
 *    ClassificationEtreVivantSaisieEspèce,
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
 /** @import {PitchouState} from '../front-end/store.js' */

/**
 * @type {Map<ClassificationEtreVivant, ClassificationEtreVivantSaisieEspèce>}
 */
export const classificationAPToclassificationSaisieEspèce = new Map([
    ["espèce végétale", "flore"],
    ["oiseau", "oiseau"],
    ["mammifère non-chiroptère", "faune non-oiseau"],
    ["chiroptère", "faune non-oiseau"],
    ["amphibien", "faune non-oiseau"],
    ["entomofaune", "faune non-oiseau"],
    ["poisson", "faune non-oiseau"],
    ["reptile", "faune non-oiseau"],
])

/** @type {Set<ClassificationEtreVivant>} */
export const classificationEtreVivants = new Set([...classificationAPToclassificationSaisieEspèce.keys()].concat(["autre"]))

/** @type {Set<ClassificationEtreVivantSaisieEspèce>} */
export const classificationEtreVivantsSaisieEspèce = new Set([...classificationAPToclassificationSaisieEspèce.values()])

/**
 * @param {string} x 
 * @returns {x is ClassificationEtreVivant}
 */
export function isClassificationAP(x){
    // @ts-ignore
    return classificationEtreVivants.has(x)
}

/**
 * @param {string} x 
 * @returns {x is ClassificationEtreVivantSaisieEspèce}
 */
export function isClassificationSaisieEspèce(x){
    // @ts-ignore
    return classificationEtreVivantsSaisieEspèce.has(x)
}


/**
 * 
 * @param {TAXREF_ROW} _ 
 * @returns {ClassificationEtreVivant}
 */
export function TAXREF_ROWClassification({REGNE, CLASSE, ORDRE, GROUP2_INPN}) {
    if (REGNE === 'Plantae' || REGNE ===  'Fungi' || REGNE === 'Chromista'){
        return 'espèce végétale'
    }

    if(REGNE === 'Animalia') {
        if (CLASSE === 'Mammalia' && ORDRE !== 'Chiroptera') {
            return 'mammifère non-chiroptère'
        }

        if (CLASSE === 'Mammalia' && ORDRE === 'Chiroptera') {
            return 'chiroptère'
        }

        if (CLASSE === 'Amphibia') return 'amphibien'
        if (CLASSE === 'Insecta' || CLASSE === 'Arachnida') return 'entomofaune'
        if (CLASSE === 'Aves') return 'oiseau'
        if (CLASSE === 'Actinopterygii') return 'poisson'

        // Dans la BDC statuts des espèces, la classe `Reptilia` n'est jamais 
        // remplie pour les reptiles, on va donc se baser sur le groupe
        // taxonomique `GROUP2_INPN`.
        if (GROUP2_INPN === 'Reptiles') return 'reptile'
    }

    return 'autre'
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
    if(!isClassificationAP(classification)){
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
 * @returns { DescriptionMenaceEspèceJSON[] }
 */
export function descriptionMenacesEspècesToJSON(descriptionMenacesEspèces){
    // @ts-ignore
    return Object.keys(descriptionMenacesEspèces).map((/** @type {ClassificationEtreVivant} */ classification) => {
        return {
            classification, 
            etresVivantsAtteints: descriptionMenacesEspèces[classification].map(etreVivantAtteintToJSON), 
        }
    })
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

 /**
  * 
  * @param {Map<ClassificationEtreVivant, EspèceProtégée[]>} espècesProtégéesParClassificationEtreVivant 
  * @returns {Map<ClassificationEtreVivantSaisieEspèce, EspèceProtégée[]>} 
  */
export function grouperEspècesParClassificationPourSaisieEspèce(espècesProtégéesParClassificationEtreVivant) {
    /**
     * @param {Map<ClassificationEtreVivant, EspèceProtégée[]>} espèces 
     * @param {ClassificationEtreVivantSaisieEspèce} classificationSaisieEspèce
     * @returns {EspèceProtégée[]}
     */
   const récupérerEspècesPourClassification = (espèces, classificationSaisieEspèce) => {
        return [...espèces]
            .map(([c, a]) => {
                if (classificationAPToclassificationSaisieEspèce.get(c) === classificationSaisieEspèce) return a

                return
            })
            .filter(a => !!a)
            .flat()
    }

    /** @type {Map<ClassificationEtreVivantSaisieEspèce, EspèceProtégée[]} */
    const espèces = new Map()

    classificationEtreVivantsSaisieEspèce.forEach((classificationSaisieEspèce) => {
        espèces.set(
            classificationSaisieEspèce, 
            récupérerEspècesPourClassification(
                espècesProtégéesParClassificationEtreVivant, 
                classificationSaisieEspèce,
            )
        )
    })

    return espèces
} 
