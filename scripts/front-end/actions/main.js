//@ts-check

import {dsv, json} from 'd3-fetch'
import remember, {forget} from 'remember'
import page from 'page'

import store from '../store.js';
import { getURL } from '../getLinkURL.js';

import { isDossierRésuméArray } from '../../types/typeguards.js';
import créerObjetCapDepuisURLs from './créerObjetCapDepuisURLs.js';
import { espèceProtégéeStringToEspèceProtégée, isClassif } from '../../commun/outils-espèces.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant} from '../../types/especes.d.ts' */

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
                }

                /** @type {PitchouState['dossiersRésumés']} */
                const dossiersById = new Map()

                for(const dossier of dossiers){
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
 * @param {ActivitéMenançante[]} activitésBrutes 
 * @param {MéthodeMenançante[]} méthodesBrutes 
 * @param {TransportMenançant[]} transportsBruts 
 * 
 * @returns {NonNullable<PitchouState['activitésMéthodesTransports']>}
 */
export function actMetTransArraysToMapBundle(activitésBrutes, méthodesBrutes, transportsBruts){
    /** @type {ParClassification<Map<ActivitéMenançante['Code'], ActivitéMenançante>>} */
    const activités = {
        oiseau: new Map(),
        "faune non-oiseau": new Map(),
        flore: new Map()
    };

    for(const activite of activitésBrutes){
        const classif = activite['Espèces']

        if(!classif.trim() && !activite['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}}`)
        }
        
        const classifActivz = activités[classif]
        classifActivz.set(activite.Code, activite)
        activités[classif] = classifActivz
    }

    /** @type {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} */
    const méthodes = {
        oiseau: new Map(),
        "faune non-oiseau": new Map(),
        flore: new Map()
    };

    for(const methode of méthodesBrutes){
        const classif = methode['Espèces']

        if(!classif.trim() && !methode['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}`)
        }
        
        const classifMeth = méthodes[classif]
        classifMeth.set(methode.Code, methode)
        méthodes[classif] = classifMeth
    }

    /** @type {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} */
    const transports = {
        oiseau: new Map(),
        "faune non-oiseau": new Map(),
        flore: new Map()
    };
    
    for(const transport of transportsBruts){
        const classif = transport['Espèces']

        if(!classif.trim() && !transport['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`)
        }
        
        const classifTrans = transports[classif]
        classifTrans.set(transport.Code, transport)
        transports[classif] = classifTrans
    }

    return {
        activités,
        méthodes,
        transports
    }
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
    const [activitésBrutes, méthodesBrutes, transportsBruts] = await Promise.all([
        dsv(";", getURL('link#activites-data')),
        dsv(";", getURL('link#methodes-data')),
        dsv(";", getURL('link#transports-data'))
    ])

    const ret = actMetTransArraysToMapBundle(activitésBrutes, méthodesBrutes, transportsBruts)
    
    store.mutations.setActivitésMéthodesTransports(ret)

    return ret
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

        chargerSchemaDS88444()
    ])
        
}