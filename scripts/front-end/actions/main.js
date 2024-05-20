//@ts-check

import store from '../store.js';
import remember from 'remember'

const PITCHOU_SECRET_STORAGE_KEY = 'secret-pitchou'

export function init(){
    
    return remember(PITCHOU_SECRET_STORAGE_KEY)
    .then(secret => {
        if(secret){
            // @ts-ignore
            store.mutations.setSecret(secret)
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