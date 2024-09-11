//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierArray } from '../../types/typeguards.js';
import créerObjetCapDepuisURLs from './créerObjetCapDepuisURLs.js';


const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){

    if(store.state.capabilities?.listerDossier){
        return store.state.capabilities?.listerDossier()
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