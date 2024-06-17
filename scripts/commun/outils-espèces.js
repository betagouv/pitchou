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