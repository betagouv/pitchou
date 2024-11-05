//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierArray } from '../../types/typeguards.js';
import créerObjetCapDepuisURLs from './créerObjetCapDepuisURLs.js';

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){

    if(store.state.capabilities?.listerRelationSuivi){
        store.state.capabilities?.listerRelationSuivi()
            .then(relationSuivisBDD => {
                if (!relationSuivisBDD || !Array.isArray(relationSuivisBDD)) {
                    throw new TypeError("On attendait un tableau de relation suivis ici !")
                }

                const relationSuivis = new Map()

                for(const {personneEmail, dossiersSuivisIds} of relationSuivisBDD){
                    relationSuivis.set(personneEmail, new Set(dossiersSuivisIds))
                }

                store.mutations.setRelationSuivis(relationSuivis)
            })
    }

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
                //console.log('dossiersById', dossiersById)
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

export async function secretFromURL(){
    const secret = new URLSearchParams(location.search).get("secret")
    
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
    store.mutations.setDossiers(new Map())
    return forget(PITCHOU_SECRET_STORAGE_KEY)
}

/**
 * 
 * @param {string} secret 
 * @returns 
 */
function initCapabilities(secret){
    return json(`/caps?secret=${secret}`)
        .then( capsURLs => {
            if(capsURLs && typeof capsURLs === 'object'){
                store.mutations.setCapabilities(
                    //@ts-ignore
                    créerObjetCapDepuisURLs(capsURLs)
                )

                // @ts-ignore
                if(capsURLs.identité){
                    // @ts-ignore
                    store.mutations.setIdentité(capsURLs.identité)
                }
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
