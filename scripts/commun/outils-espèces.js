//@ts-check

/** @type {Map<ClassificationEtreVivant, (espèce: Espèce) => boolean>} */
export const filtreParClassification = new Map([
    ["oiseau", ((/** @type {Espèce} */ {REGNE, CLASSE}) => {
        return REGNE === 'Animalia' && CLASSE === 'Aves'
    })],
    ["faune non-oiseau", ((/** @type {Espèce} */ {REGNE, CLASSE}) => {
        return REGNE === 'Animalia' && CLASSE !== 'Aves'
    })],
    ["flore", ((/** @type {Espèce} */ {REGNE}) => {
        return REGNE === 'Plantae'
    })]
])

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