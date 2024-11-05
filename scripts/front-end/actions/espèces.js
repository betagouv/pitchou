import {dsv, json} from 'd3-fetch'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { 
    espèceProtégéeStringToEspèceProtégée, 
    isClassificationAP,
    isClassificationSaisieEspèce
} from '../../commun/outils-espèces.js';

/** @import {PitchouState} from '../store.js' */
/** @import {
 *    ActivitéMenançante, 
 *    ClassificationEtreVivant, 
 *    EspèceProtégée, 
 *    GroupesEspèces, 
 *    NomGroupeEspèces,
 *    MéthodeMenançante, 
 *    TransportMenançant,
 * } from '../../types/especes.d.ts' */


/**
 * 
 * @returns {Promise<{espècesProtégéesParClassification: NonNullable<PitchouState['espècesProtégéesParClassification']>, espèceByCD_REF: NonNullable<PitchouState['espèceByCD_REF']>}>}
 */
export async function chargerListeEspècesProtégées(){
    if(store.state.espècesProtégéesParClassification && store.state.espèceByCD_REF){
        const {espècesProtégéesParClassification, espèceByCD_REF} = store.state;

        return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF })
    }

    const dataEspèces = await dsv(";", getURL('link#especes-data'))

    /** @type {PitchouState['espècesProtégéesParClassification']} */
    const espècesProtégéesParClassification = new Map()
    /** @type {PitchouState['espèceByCD_REF']} */
    const espèceByCD_REF = new Map()

    for(const espStr of dataEspèces){
        const {classification} = espStr
        
        if(!isClassificationAP(classification)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classification}.}`)
        }

        const espèces = espècesProtégéesParClassification.get(classification) || []

        /** @type {EspèceProtégée} */
        // @ts-ignore
        const espèce = Object.freeze(espèceProtégéeStringToEspèceProtégée(espStr))

        espèces.push(espèce)
        espèceByCD_REF.set(espèce['CD_REF'], espèce)

        espècesProtégéesParClassification.set(classification, espèces)
    }

    store.mutations.setEspècesProtégéesParClassification(espècesProtégéesParClassification)
    store.mutations.setEspèceByCD_REF(espèceByCD_REF)

    return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF })
}

/**
 * 
 * @param {NonNullable<PitchouState["espèceByCD_REF"]>} espèceByCD_REF
 * @returns {Promise<Map<NomGroupeEspèces, EspèceProtégée[]>>}
 */
export async function chargerGroupesEspèces(espèceByCD_REF) {
    /** @type {GroupesEspèces | undefined} */
    const groupesEspècesBrutes = await json(getURL('link#groupes-especes-data'))

    if(!groupesEspècesBrutes){
        throw new TypeError(`groupesEspècesBrutes manquants`)
    }

    /** @type {Map<NomGroupeEspèces, EspèceProtégée[]>} */
    const groupesEspèces = new Map()
    for(const [nomGroupe, espèces] of Object.entries(groupesEspècesBrutes)){
        groupesEspèces.set(
            nomGroupe,
            //@ts-ignore TS doesn't understand what happens with .filter
            espèces.map(e => {
                if(typeof e === 'string'){
                    return undefined
                }
    
                return espèceByCD_REF.get(e['CD_REF']) // may be undefined and that's ok
            })
            .filter(x => !!x)
        )
    }

    return Promise.resolve(groupesEspèces)
}

/**
 * 
 * @returns {Promise<NonNullable<PitchouState['activitésMéthodesTransports']>>}
 */
export async function chargerActivitésMéthodesTransports(){

    if(store.state.activitésMéthodesTransports){
        return Promise.resolve(store.state.activitésMéthodesTransports)
    }

    /** @type { [ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[]] } */
    // @ts-ignore
    const [activitésBrutes, méthodesBrutes, transportsBruts, groupesEspècesBrutes] = await Promise.all([
        dsv(";", getURL('link#activites-data')),
        dsv(";", getURL('link#methodes-data')),
        dsv(";", getURL('link#transports-data')),
    ])


    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    const activités = new Map()
    for(const activite of activitésBrutes){
        const classif = activite['Espèces']

        if(!classif.trim() && !activite['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassificationSaisieEspèce(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}}`)
        }
        
        const classifActivz = activités.get(classif) || []
        classifActivz.push(activite)
        activités.set(classif, classifActivz)
    }

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    const méthodes = new Map()
    for(const methode of méthodesBrutes){
        const classif = methode['Espèces']

        if(!classif.trim() && !methode['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassificationSaisieEspèce(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}`)
        }
        
        const classifMeth = méthodes.get(classif) || []
        classifMeth.push(methode)
        méthodes.set(classif, classifMeth)
    }

    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    const transports = new Map()
    for(const transport of transportsBruts){
        const classif = transport['Espèces']

        if(!classif.trim() && !transport['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassificationSaisieEspèce(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`)
        }
        
        const classifTrans = transports.get(classif) || []
        classifTrans.push(transport)
        transports.set(classif, classifTrans)
    }

    const ret = {
        activités,
        méthodes,
        transports
    }

    store.mutations.setActivitésMéthodesTransports(ret)

    return ret
}
