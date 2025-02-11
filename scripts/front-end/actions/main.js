//@ts-check

import {json} from 'd3-fetch'
import remember, {forget} from 'remember'
import page from 'page'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierRésuméArray } from '../../types/typeguards.js';
import créerObjetCapDepuisURLs from './créerObjetCapDepuisURLs.js';

/** @import {PitchouState} from '../store.js' */
/** @import {default as RésultatSynchronisationDS88444} from '../../types/database/public/RésultatSynchronisationDS88444.js' */

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
            .then((dossiers) => {
                if (!isDossierRésuméArray(dossiers)) {
                    throw new TypeError("On attendait un tableau de dossiers ici !")
                }

                /* Formatter les dossiers */
                for(const dossier of dossiers){
                    dossier.date_dépôt = new Date(dossier.date_dépôt)
                    dossier.date_début_phase = new Date(dossier.date_début_phase)
                }

                /** @type {PitchouState['dossiersRésumés']} */
                const dossiersById = new Map()

                for(const dossier of dossiers){
                    Object.freeze(dossier)
                    dossiersById.set(dossier.id, dossier)
                }

                store.mutations.setDossiersRésumés(dossiersById)

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

export function chargerRésultatsSynchronisation(){
    // @ts-ignore
    return json('résultats-synchronisation').then( (/** @type {RésultatSynchronisationDS88444[]} */ résultatsSync) => {
        for(const r of résultatsSync){
            r.horodatage = new Date(r.horodatage)
        }

        store.mutations.setRésultatsSynchronisationDS88444(résultatsSync)
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
    store.mutations.setCapabilities({})
    store.mutations.setIdentité(undefined)

    store.mutations.setDossiersRésumés(new Map())
    store.mutations.setDossiersComplets(new Map())
    store.mutations.resetMessages()
    store.mutations.setRelationSuivis(new Map())

    return forget(PITCHOU_SECRET_STORAGE_KEY)
}


/**
 * 
 * @param {{message: string}} [erreur]
 * @returns 
 */
export async function logoutEtRedirigerVersAccueil(erreur){
    if(erreur){
        store.mutations.ajouterErreur(erreur)
    }

    return logout().then(() => page('/'))
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
            .catch(() => logoutEtRedirigerVersAccueil({
                message: `Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
            })),

        chargerSchemaDS88444(),
        chargerRésultatsSynchronisation()
    ])
        
}