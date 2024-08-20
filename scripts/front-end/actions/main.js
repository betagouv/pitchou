//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierArray } from '../../types/typeguards.js';

/** @typedef {import('../../types/database/public/Dossier.js').default} Dossier */

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){
    console.log('store.state.secret', store.state.secret)
    if(store.state.secret){
        return json(`/dossiers?secret=${store.state.secret}`)
            .then(dossiers => {
                if (!isDossierArray(dossiers)) {
                    throw new Error("On attendait un tableau de dossiers ici !")
                }

                const dossiersById = dossiers.reduce((objetFinal, dossier) => {
                    objetFinal.set(dossier.id, dossier)
                    return objetFinal
                }, new Map())
                console.log('dossiersById', dossiersById)
                store.mutations.setDossiers(dossiersById)

                return dossiers
            })
    }
    else{
        return Promise.reject(new TypeError('Impossible de charger les dossiers, secret manquant'))
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
        store.mutations.setSecret(secret)

        return Promise.all([
            remember(PITCHOU_SECRET_STORAGE_KEY, secret),
            initCapabilities(secret)
        ])
    }
}

export async function logout(){
    store.mutations.setSecret(undefined)
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
        .then(caps => {
            store.mutations.setCapabilities(caps)

            return Promise.all([
                caps.listeDossiers ? chargerDossiers(caps.listeDossiers) : undefined
            ])
        })
}


export function init(){

    return Promise.all([
        remember(PITCHOU_SECRET_STORAGE_KEY)
            //@ts-ignore
            .then(secret => secret ? initCapabilities(secret) : undefined)
            .catch(logout),
        chargerSchemaDS88444
    ])
        
}