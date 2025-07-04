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
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces, CodeActivitéStandard, CodeActivitéPitchou} from '../../types/especes.d.ts' */

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
        Object.freeze(activite)
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
        Object.freeze(methode)
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
        Object.freeze(transport)
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
 * Charge et organise les activités, méthodes et transports depuis les fichiers CSV externes.
 * 
 * Cette fonction récupère les données depuis trois sources distinctes :
 * - Les activités menaçantes (activités-data)
 * - Les méthodes menaçantes (methodes-data) 
 * - Les transports menaçants (transports-data)
 * 
 * Les données sont organisées par classification d'espèces (oiseau, faune non-oiseau, flore)
 * et indexées par leur code pour un accès optimisé.
 * 
 * @returns {Promise<NonNullable<PitchouState['activitésMéthodesTransports']>>}
 * Une promesse résolue avec un objet contenant :
 * - `activités` : Map des activités organisées par classification
 * - `méthodes` : Map des méthodes organisées par classification  
 * - `transports` : Map des transports organisés par classification
 * 
 * @throws {TypeError} Si une classification d'espèce n'est pas reconnue
 * @throws {Error} Si les fichiers de données ne peuvent pas être chargés
 * 
 * @remarks
 * - La fonction utilise un cache dans le store pour éviter les rechargements inutiles
 * - Les données sont automatiquement gelées (Object.freeze) pour prévenir les modifications
 * - Cette fonction met également à jour le store avec les activités indexées par code
 * - Les lignes vides dans les fichiers CSV sont automatiquement ignorées
 * 
 * @see {@link actMetTransArraysToMapBundle} Pour la logique de transformation des données
 * @see {@link getActivitéByCode} Pour la création des activités additionnelles Pitchou
 * 
 */
export async function chargerActivitésMéthodesTransportsActivitéByCode(){

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
    
    store.mutations.setActivitéByCode(getActivitéByCode(ret.activités))

    return ret
}

/**
 * @param {ArrayBuffer} fichierArrayBuffer 
 * @returns {Promise<DescriptionMenacesEspèces>}
 */
export async function espècesImpactéesDepuisFichierOdsArrayBuffer(fichierArrayBuffer){
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransportsActivitéByCode()

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

/**
 * Récupère et fusionne l'ensemble des activités issues du standard européen 
 * ainsi que les activités spécifiques à Pitchou, en les indexant par leur code.
 * @param {ParClassification<Map<CodeActivitéStandard | CodeActivitéPitchou, ActivitéMenançante>>} activités
 * @returns {Map<ActivitéMenançante['Code'], ActivitéMenançante>}
 * Une promesse résolue avec une `Map` contenant toutes les activités, 
 * indexées par leur code.
 *
 * @throws {Error} Si l’activité "4" (de base) est absente, ce qui empêche la création
 * des variantes spécifiques à Pitchou.
 *
 * @remarks
 * - Les données retournées sont indépendantes du dossier sélectionné.
 * - Les activités spécifiques Pitchou utilisent des identifiants personnalisés 
 *   pour éviter toute collision future avec les standards européens.
 * - Cette fonction pourrait être déplacée dans un fichier dédié, 
 *   comme `activitésMéthodesTransports.ts`.
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Référence du schéma XML de la directive Habides 2.0, définissant les types d’activités.
 */
export function getActivitéByCode(activités) {
    const activité4 = activités.oiseau.get('4')
    if(!activité4){
        throw Error(`Activité 4 manquante`)
    }

    /** @type {Map<ActivitéMenançante['Code'], ActivitéMenançante>} */
    //@ts-ignore
    const activitésAdditionnelles = new Map([
        {
            ...activité4,
            Code: '4-1-pitchou-aires',
            "étiquette affichée": `Destruction d’aires de repos ou reproduction`
        },
        {
            ...activité4,
            Code: '4-2-pitchou-nids',
            "étiquette affichée": `Destruction de nids`
        },
        {
            ...activité4,
            Code: '4-3-pitchou-œufs',
            "étiquette affichée": `Destruction d'œufs`
        }
    ].map(a => [a.Code, a]))

    return new Map([
        ...activités.oiseau, 
        ...activitésAdditionnelles, 
        ...activités['faune non-oiseau'], 
        ...activités.flore
    ])
}