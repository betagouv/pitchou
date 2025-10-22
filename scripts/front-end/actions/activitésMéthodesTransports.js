//@ts-check

import {dsv, buffer} from 'd3-fetch'
import store from "../store"
import { getURL } from '../getLinkURL.js';
import { espèceProtégéeStringToEspèceProtégée, actMetTransArraysToMapBundle, isClassif, construireActivitésMéthodesTransports } from '../../commun/outils-espèces.js';

//@ts-ignore
/** @import {PitchouState} from '../store.js' */
//@ts-ignore
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces, CodeActivitéStandard, CodeActivitéPitchou, ImpactQuantifié} from '../../types/especes.d.ts' */


/**
 * @returns {Promise<{espècesProtégéesParClassification: NonNullable<PitchouState['espècesProtégéesParClassification']>, espèceByCD_REF: NonNullable<PitchouState['espèceByCD_REF']>}>}
 */
export async function chargerListeEspècesProtégées(){

    if(store.state.espècesProtégéesParClassification && store.state.espèceByCD_REF){
        const {espècesProtégéesParClassification, espèceByCD_REF} = store.state;

        return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF })
    }

    const dataEspèces = await dsv(";", getURL('link#especes-data'))

    /** @type {PitchouState['espècesProtégéesParClassification']} */
    const espècesProtégéesParClassification = {
        oiseau: [] ,
        "faune non-oiseau": [],
        flore: []
    }
    /** @type {PitchouState['espèceByCD_REF']} */
    const espèceByCD_REF = new Map()

    for(const espStr of dataEspèces){
        const {classification} = espStr

        if(!isClassif(classification)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classification}.}`)
        }

        const espèces = espècesProtégéesParClassification[classification] || []

        /** @type {EspèceProtégée} */
        // @ts-ignore
        const espèce = Object.freeze(espèceProtégéeStringToEspèceProtégée(espStr))

        espèces.push(espèce)
        espèceByCD_REF.set(espèce['CD_REF'], espèce)

        espècesProtégéesParClassification[classification] = espèces
    }

    store.mutations.setEspècesProtégéesParClassification(espècesProtégéesParClassification)
    store.mutations.setEspèceByCD_REF(espèceByCD_REF)

    return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF })
}

/**
 * Charge et organise données concernant les activités, méthodes et transports depuis les fichiers CSV externes.
 * @returns {Promise<NonNullable<PitchouState['activitésMéthodesTransports']>>}
 * - activités : Map indexée par classification d'espèce (oiseau, faune non-oiseau, flore) contenant les activités menaçantes indexées par leur code
 * - méthodes : Map indexée par classification d'espèce contenant les méthodes menaçantes indexées par leur code
 * - transports : Map indexée par classification d'espèce contenant les transports menaçants indexés par leur code
 *
 * @remarks
 * - La fonction utilise un cache dans le store pour éviter les rechargements inutiles
 * - Les données sont automatiquement gelées (Object.freeze) pour prévenir les modifications
 * - Cette fonction met également à jour le store avec les activités indexées par code
 * - Les lignes vides dans les fichiers CSV sont automatiquement ignorées
 *
 * @see {@link actMetTransArraysToMapBundle} Pour la logique de transformation des données
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Référence du schéma XML de la directive Habides 2.0, définissant les types d’activités.
 */
export async function chargerActivitésMéthodesTransports(){

    if(store.state.activitésMéthodesTransports){
        return Promise.resolve(store.state.activitésMéthodesTransports)
    }

    const odsData = await buffer(getURL('link#activites-methodes-transports-data'))
    // @ts-ignore
    const ret = await construireActivitésMéthodesTransports(odsData)

    store.mutations.setActivitésMéthodesTransports(ret)

    return ret
}
