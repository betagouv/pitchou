//@ts-check

import {dsv, buffer} from 'd3-fetch'
import { getODSTableRawContent, tableRawContentToObjects } from '@odfjs/odfjs';
import store from "../store"
import { getURL } from '../getLinkURL.js';
import { espèceProtégéeStringToEspèceProtégée, actMetTransArraysToMapBundle, isClassif } from '../../commun/outils-espèces.js';

//@ts-ignore
/** @import {PitchouState} from '../store.js' */
//@ts-ignore
/** @import {ParClassification, ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces, CodeActivitéStandard, CodeActivitéPitchou} from '../../types/especes.d.ts' */


/**
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
 * Charge et organise données concernant les activités, méthodes et transports depuis les fichiers CSV externes.
 * @returns {Promise<NonNullable<PitchouState['activitésMéthodesTransports']>>}
 * - activités : Map indexée par classification d'espèce (oiseau, faune non-oiseau, flore) contenant les activités menaçantes indexées par leur code
 * - méthodes : Map indexée par classification d'espèce contenant les méthodes menaçantes indexées par leur code
 * - transports : Map indexée par classification d'espèce contenant les transports menaçants indexés par leur code
 *
 * @remarks
 * - La fonction utilise un cache dans le store pour éviter les rechargements inutiles
 * - Les données sont automatiquement gelées (Object.freeze) pour prévenir les modifications
 * - Cette fonction met également à jour le store avec les activités indexées par code
 * - Les lignes vides dans les fichiers CSV sont automatiquement ignorées
 *
 * @see {@link actMetTransArraysToMapBundle} Pour la logique de transformation des données
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Référence du schéma XML de la directive Habides 2.0, définissant les types d’activités.
 */
export async function chargerActivitésMéthodesTransports(){

    if(store.state.activitésMéthodesTransports){
        return Promise.resolve(store.state.activitésMéthodesTransports)
    }

    const odsData = await buffer(getURL('link#activites-methodes-transports-data'));
    const activitésMéthodesTransportsBruts = await getODSTableRawContent(odsData).then(tableRawContentToObjects)

    // Les lignes sont réassignées dans des nouveaux objets pour qu'ils aient la méthode `Object.prototype.toString`
    // utilisée par Svelte

    /**  @type {ParClassification<ActivitéMenançante[]>} */
    const activitésBrutes = {
        oiseau: activitésMéthodesTransportsBruts.get("Activités oiseau").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
        "faune non-oiseau": activitésMéthodesTransportsBruts.get("Activités faune non oiseau").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
        flore: activitésMéthodesTransportsBruts.get("Activités flore").map(
            // @ts-ignore
            row => Object.assign({}, row)
        ),
    }
    /** @type { MéthodeMenançante[] } */
    const méthodesBrutes = activitésMéthodesTransportsBruts.get("Méthodes").map(
        // @ts-ignore
        row => Object.assign({}, row)
    )
    /** @type { TransportMenançant[] } */
    const moyensPoursuite = activitésMéthodesTransportsBruts.get("Moyens de poursuite").map(
        // @ts-ignore
        row => Object.assign({}, row)
    )

    const activitésMéthodesTransports = actMetTransArraysToMapBundle(
        activitésBrutes,
        méthodesBrutes,
        moyensPoursuite
    )

    store.mutations.setActivitésMéthodesTransports(activitésMéthodesTransports)

    return activitésMéthodesTransports
}

/**
 * Récupère et fusionne l'ensemble des activités issues du standard européen
 * ainsi que les activités spécifiques à Pitchou, en les indexant par leur code.
 * @param {ParClassification<Map<CodeActivitéStandard | CodeActivitéPitchou, ActivitéMenançante>>} activités
 * @returns {Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>}
 * Une promesse résolue avec une `Map` contenant toutes les activités,
 * indexées par leur code.
 *
 * @throws {Error} Si l’activité "4" (de base) est absente, ce qui empêche la création
 * des variantes spécifiques à Pitchou.
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Référence du schéma XML de la directive Habides 2.0, définissant les types d’activités.
 */
export function getActivitésNomenclaturePitchou(activités) {
    const activité4 = activités.oiseau.get('4')
    if(!activité4){
        throw Error(`Activité 4 manquante`)
    }

    /** @type {Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>} */
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
