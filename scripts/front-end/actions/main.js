//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

/** @typedef {import('../../types/database/public/Dossier.js').default} Dossier */

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){
    console.log('store.state.secret', store.state.secret)
    if(store.state.secret){
        return json(`/dossiers?secret=${store.state.secret}`)
            .then(dossiers => {
                if (Array.isArray(dossiers)) {
                    const dossiersById = dossiers.reduce((objetFinal, dossier) => {
                        objetFinal.set(dossier.id, dossier)
                        return objetFinal
                    }, new Map())
                    console.log('dossiersById', dossiersById)
                    store.mutations.setDossiers(dossiersById)
                    return dossiers
                } else {
                    return Promise.reject(new TypeError('La requête à /dossiers renvoie une 204 ou une 205'))
                }
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

export function init(){
    return remember(PITCHOU_SECRET_STORAGE_KEY)
        .then(secret => {
            if(secret){
                // @ts-ignore
                store.mutations.setSecret(secret)
                return chargerDossiers()
            }
        })
        .then(chargerSchemaDS88444)
        .catch(() => logout())
}

export async function secretFromURL(){
    const secret =  new URLSearchParams(location.search).get("secret")
    
    if(secret){
        const newURL = new URL(location.href)
        newURL.searchParams.delete("secret")

        history.replaceState(null, "", newURL)
        store.mutations.setSecret(secret)

        return remember(PITCHOU_SECRET_STORAGE_KEY, secret)
    }
}

export async function logout(){
    store.mutations.setSecret(undefined)
    store.mutations.setDossiers(undefined)
    return forget(PITCHOU_SECRET_STORAGE_KEY)
}