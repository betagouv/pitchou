//@ts-check

/** @type {Set<'oiseau' | 'faune non-oiseau' | 'flore'>} */
const classificationEtreVivants = new Set(["oiseau", "faune non-oiseau", "flore"])

/**
 * @param {string} x 
 * @returns {x is ClassificationEtreVivant}
 */
export function isClassif(x){
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
 * @param {EspèceProtégéeStrings} param0 
 * @returns {EspèceProtégée}
 */
export function espèceProtégéeStringToEspèceProtégée({CD_REF, CD_TYPE_STATUTS, classification, nomsScientifiques, nomsVernaculaires}){
    if(!isClassif(classification)){
        throw new TypeError(`Classification d'espèce non reconnue: ${classification}. Les choix sont : ${classificationEtreVivants.join(', ')}`)
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
 * @param { OiseauAtteint | EtreVivantAtteint } etreVivantAtteint
 * @returns { OiseauAtteintJSON | EtreVivantAtteintJSON }
 */
function etreVivantAtteintToJSON(etreVivantAtteint){
    const {
        espèce, 
        activité, méthode, transport,
        nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit
    } = etreVivantAtteint

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