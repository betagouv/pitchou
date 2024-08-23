//@ts-check

/** @import {ClassificationEtreVivant, EspèceProtégée, DescriptionMenaceEspèce, EtreVivantAtteint, TAXREF_ROW, EspèceProtégéeStrings, OiseauAtteintJSON, EtreVivantAtteintJSON, DescriptionMenaceEspècesJSON, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../types.js" */


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
 * @typedef {EtreVivantAtteint & {nombreNids?: number, nombreOeufs?: number }} EtreVivantOuOiseauAtteint
 * 
 * @param { EtreVivantOuOiseauAtteint } EtreVivantOuOiseauAtteint
 * @returns { OiseauAtteintJSON | EtreVivantAtteintJSON }
 */
function etreVivantAtteintToJSON(EtreVivantOuOiseauAtteint){
    const {
        espèce, 
        activité, méthode, transport,
        nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit
    } = EtreVivantOuOiseauAtteint

    if(nombreNids || nombreOeufs){
        return {
            espèce: espèce['CD_REF'],
            activité: activité && activité.Code, 
            méthode: méthode && méthode.Code, 
            transport: transport && transport.Code,
            nombreIndividus, 
            nombreNids, 
            nombreOeufs, 
            surfaceHabitatDétruit
        }
    }
    else{
        return {
            espèce: espèce['CD_REF'],
            activité: activité && activité.Code, 
            méthode: méthode && méthode.Code, 
            transport: transport && transport.Code,
            nombreIndividus,
            surfaceHabitatDétruit
        }
    }
}

/**
 * 
 * @param { DescriptionMenaceEspèce[] } descriptionMenacesEspèces
 * @returns { DescriptionMenaceEspècesJSON }
 */
export function descriptionMenacesEspècesToJSON(descriptionMenacesEspèces){
    return descriptionMenacesEspèces.map(({classification, etresVivantsAtteints}) => {
        return {
            classification, 
            etresVivantsAtteints: etresVivantsAtteints.map(etreVivantAtteintToJSON), 
            
        }
    })
}

/**
 * @param {DescriptionMenaceEspècesJSON} descriptionMenacesEspècesJSON
 * @param {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} espèceByCD_REF
 * @param {ActivitéMenançante[]} activites
 * @param {MéthodeMenançante[]} methodes
 * @param {TransportMenançant[]} transports
 * @returns {DescriptionMenaceEspèce[]}
 */
export function descriptionMenacesEspècesFromJSON(descriptionMenacesEspècesJSON, espèceByCD_REF, activites, methodes, transports){
    //@ts-ignore
    return descriptionMenacesEspècesJSON.map(({classification, etresVivantsAtteints}) => {

        return {
            classification, 
            etresVivantsAtteints: etresVivantsAtteints.map(({espèce, espece, activité, méthode, transport, ...rest}) => {
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
            }), 
        }
    })
}