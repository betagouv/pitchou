//@ts-check

import {dsv, json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierArray } from '../../types/typeguards.js';
import créerObjetCapDepuisURLs from './créerObjetCapDepuisURLs.js';
import { espèceProtégéeStringToEspèceProtégée, isClassif } from '../../commun/outils-espèces.js';

/** @import {PitchouState} from '../store.js' */
/** @import {EspèceProtégée} from '../../types/especes.d.ts' */

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){

    if(store.state.capabilities?.listerDossiers){
        return store.state.capabilities?.listerDossiers()
            .then(dossiers => {
                if (!isDossierArray(dossiers)) {
                    throw new TypeError("On attendait un tableau de dossiers ici !")
                }

                const dossiersById = dossiers.reduce((objetFinal, dossier) => {
                    objetFinal.set(dossier.id, dossier)
                    return objetFinal
                }, new Map())
                console.log('dossiersById', dossiersById)
                store.mutations.setDossiers(dossiersById)

                return dossiersById
            })
    }
    else{
        return Promise.reject(new TypeError('Impossible de charger les dossiers, capability manquante'))
    }
}

export function chargerSchemaDS88444() {
    return json(getURL("link#schema-DS8844")).then((schema) => { 
        //@ts-ignore
        store.mutations.setSchemaDS88444(schema)
        return schema
    })
}

/**
 * 
 * @returns {Promise<{espècesProtégéesParClassification: PitchouState['espècesProtégéesParClassification'], espèceByCD_REF: PitchouState['espèceByCD_REF']}>}
 */
export async function chargerListeEspècesProtégées(){

    if(store.state.espècesProtégéesParClassification && store.state.espèceByCD_REF){
        const {espècesProtégéesParClassification, espèceByCD_REF} = store.state;

        return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF })
    }

    const dataEspèces = await dsv(";", getURL('link#especes-data'))

    /** @type {PitchouState['espècesProtégéesParClassification']} */
    const espècesProtégéesParClassification = new Map()
    /** @type {PitchouState['espèceByCD_REF']>} */
    const espèceByCD_REF = new Map()

    for(const espStr of dataEspèces){
        const {classification} = espStr

        if(!isClassif(classification)){
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

export function chargerActivitésMéthodesTransports(){
    
}


export async function secretFromURL(){
    const secret =  new URLSearchParams(location.search).get("secret")
    
    if(secret){
        const newURL = new URL(location.href)
        newURL.searchParams.delete("secret")

        // nettoyer l'url pour que le secret n'y apparaisse plus
        history.replaceState(null, "", newURL)

        return Promise.all([
            remember(PITCHOU_SECRET_STORAGE_KEY, secret),
            initCapabilities(secret)
        ])
    }
}

export async function logout(){
    store.mutations.setCapabilities(undefined)
    store.mutations.setDossiers(undefined)
    return forget(PITCHOU_SECRET_STORAGE_KEY)
}

/**
 * 
 * @param {string} secret 
 * @returns 
 */
function initCapabilities(secret){
    return json(`/caps?secret=${secret}`)
        .then(capsURLs => {
            if(capsURLs && typeof capsURLs === 'object'){
                store.mutations.setCapabilities(
                    créerObjetCapDepuisURLs(capsURLs)
                )
            }
            else{
                throw new TypeError(`capsURLs non-reconnu (${typeof capsURLs} - ${capsURLs})`)
            }
        })
}


export function init(){

    return Promise.all([
        remember(PITCHOU_SECRET_STORAGE_KEY)
            //@ts-ignore
            .then(secret => secret ? initCapabilities(secret) : undefined)
            .catch(logout),
        chargerSchemaDS88444()
    ])
        
}