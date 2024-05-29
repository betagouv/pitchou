//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'

import store from '../store.js';

/** @typedef {import('../../types/database/public/Dossier.js').default} Dossier */

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function chargerDossiers(){
    console.log('store.state.secret', store.state.secret)
    if(store.state.secret){
        return json(`/dossiers?secret=${store.state.secret}`)
            .then(/** @type {Dossier[]} */ dossiers => {
                console.log('dossiers', dossiers)
                store.mutations.setDossiers(dossiers)
                return dossiers
            })
    }
    else{
        return Promise.reject('Impossible de charger les dossiers, secret manquant')
    }
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
    return forget(PITCHOU_SECRET_STORAGE_KEY)
}