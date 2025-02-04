//@ts-check

import {dsv} from 'd3-fetch'

import store from "../store"
import { getURL } from '../getLinkURL.js';

import { espèceProtégéeStringToEspèceProtégée, importDescriptionMenacesEspècesFromOdsArrayBuffer, isClassif } from '../../commun/outils-espèces.js';

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierComplet, DossierPhase} from '../../types/API_Pitchou.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */
//@ts-ignore
/** @import {PitchouState} from '../store.js' */
//@ts-ignore
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces} from '../../types/especes.d.ts' */

/**
 * @param {DossierComplet} dossier
 * @param {Partial<DossierComplet>} modifs
 * @returns {Promise<void>}
 */
export function modifierDossier(dossier, modifs) {
    if(!store.state.capabilities.modifierDossier)
        throw new TypeError(`Capability modifierDossier manquante`)

    // modifier le dossier dans le store de manière optimiste
    /** @type {DossierComplet} */
    const dossierModifié = Object.assign({}, dossier, modifs)
    if(modifs.évènementsPhase){
        dossierModifié.évènementsPhase = [
            ...modifs.évènementsPhase,
            ...dossier.évènementsPhase
        ]
    }

    store.mutations.setDossierComplet(dossierModifié)

    return store.state.capabilities.modifierDossier(dossier.id, modifs)
        .catch(err  => {
            // en cas d'erreur, remettre le dossier précédent dans le store comme avant la copie
            store.mutations.setDossierComplet(dossier)
            throw err
        })
}

/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<Message[]>}
 */
export async function chargerMessagesDossier(id){
    if(!store.state.capabilities?.listerMessages)
        throw new TypeError(`Capability listerMessages manquante`)

    const messagesP = store.state.capabilities?.listerMessages(id)
        .then((/** @type {Message[]} */ messages)  => {
            store.mutations.setMessages(id, messages)
            return messages
        })

    return store.state.messagesParDossierId.get(id) || messagesP
}


/**
 * @param {DossierComplet['id']} id
 * @returns {Promise<DossierComplet>}
 */
export async function getDossierComplet(id){
    const dossierCompletInStore = store.state.dossiersComplets.get(id)

    if(dossierCompletInStore){
        return dossierCompletInStore
    }

    if(!store.state.capabilities.recupérerDossierComplet)
        throw new TypeError(`Capability recupérerDossierComplet manquante`)

    const dossierComplet = await store.state.capabilities.recupérerDossierComplet(id)
    store.mutations.setDossierComplet(dossierComplet)
    
    return dossierComplet
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

/**
 * @param {ArrayBuffer} fichierArrayBuffer 
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
export async function espècesImpactéesDepuisFichierOdsArrayBuffer(fichierArrayBuffer){
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    const {espèceByCD_REF} = await espècesProtégées
    const { activités, méthodes, transports } = await actMétTrans

    return importDescriptionMenacesEspècesFromOdsArrayBuffer(
        fichierArrayBuffer,
        espèceByCD_REF,
        activités,
        méthodes,
        transports
    )

}