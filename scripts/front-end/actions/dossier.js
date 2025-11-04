//@ts-check
/** @import {PitchouState} from '../store.js' */
import store from "../store"

import { importDescriptionMenacesEspècesFromOdsArrayBuffer } from '../../commun/outils-espèces.js';
import { chargerActivitésMéthodesMoyensDePoursuite, chargerListeEspècesProtégées } from './activitésMéthodesMoyensDePoursuite.js';
import { isDossierRésuméArray } from '../../types/typeguards.js';
import { chargerRelationSuivi } from "./main.js";

//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {DossierComplet, DossierPhase} from '../../types/API_Pitchou.d.ts' */
//@ts-expect-error TS ne comprends pas que le type est utilisé dans le jsdoc
/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */
//@ts-ignore
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, MoyenDePoursuiteMenaçant, DescriptionMenacesEspèces, CodeActivitéStandard, CodeActivitéPitchou} from '../../types/especes.d.ts' */

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
 * @param {DossierComplet['id']} id
 * @returns {Promise<DossierComplet>}
 */
export async function refreshDossierComplet(id){
    if(!store.state.capabilities.recupérerDossierComplet)
        throw new TypeError(`Capability recupérerDossierComplet manquante`)

    const dossierComplet = await store.state.capabilities.recupérerDossierComplet(id)
    store.mutations.setDossierComplet(dossierComplet)

    return dossierComplet
}

/**
 * @param {ArrayBuffer} fichierArrayBuffer
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
export async function espècesImpactéesDepuisFichierOdsArrayBuffer(fichierArrayBuffer){
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesMoyensDePoursuite()

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

export function chargerDossiers(){

    chargerRelationSuivi()

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
