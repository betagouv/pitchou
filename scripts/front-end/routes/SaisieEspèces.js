//@ts-check

import { dsv, json } from 'd3-fetch';

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import SaisieEspèces from '../components/screens/SaisieEspèces.svelte';

import { espèceProtégéeStringToEspèceProtégée, importDescriptionMenacesEspècesFromURL, isClassif } from '../../commun/outils-espèces.js';
import { getURL } from '../getLinkURL.js';

/** @import {ComponentProps} from 'svelte' */

/** @import {
 *    ClassificationEtreVivant,
 *    EspèceProtégée, 
 *    EspèceProtégéeStrings,
 *    ActivitéMenançante, 
 *    MéthodeMenançante, 
 *    TransportMenançant,
 *    GroupesEspèces, 
 *    NomGroupeEspèces
 *  } from "../../types/especes.d.ts" 
 **/
/** @import {PitchouState} from '../store.js' */

export default async () => { 
    /** @type { [EspèceProtégéeStrings[], ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[], GroupesEspèces] } */
    // @ts-ignore
    const [dataEspèces, activites, methodes, transports, groupesEspècesBrutes] = await Promise.all([
        dsv(";", getURL('link#especes-data')),
        dsv(";", getURL('link#activites-data')),
        dsv(";", getURL('link#methodes-data')),
        dsv(";", getURL('link#transports-data')),
        json(getURL('link#groupes-especes-data')),
    ])


    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    const activitesParClassificationEtreVivant = new Map()
    for(const activite of activites){
        const classif = activite['Espèces']

        if(!classif.trim() && !activite['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}}`)
        }
        
        const classifActivz = activitesParClassificationEtreVivant.get(classif) || []
        classifActivz.push(activite)
        activitesParClassificationEtreVivant.set(classif, classifActivz)
    }

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    const méthodesParClassificationEtreVivant = new Map()
    for(const methode of methodes){
        const classif = methode['Espèces']

        if(!classif.trim() && !methode['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}`)
        }
        
        const classifMeth = méthodesParClassificationEtreVivant.get(classif) || []
        classifMeth.push(methode)
        méthodesParClassificationEtreVivant.set(classif, classifMeth)
    }

    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    const transportsParClassificationEtreVivant = new Map()
    for(const transport of transports){
        const classif = transport['Espèces']

        if(!classif.trim() && !transport['Code']){
            // ignore empty lines (certainly comments)
            break; 
        }

        if(!isClassif(classif)){
            throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`)
        }
        
        const classifTrans = transportsParClassificationEtreVivant.get(classif) || []
        classifTrans.push(transport)
        transportsParClassificationEtreVivant.set(classif, classifTrans)
    }

    console.log('espècesProtégéesParClassification', espècesProtégéesParClassification)

    
    /** @type {Map<NomGroupeEspèces, EspèceProtégée[]>} */
    const groupesEspèces = new Map()
    for(const [nomGroupe, espèces] of Object.entries(groupesEspècesBrutes)){
        groupesEspèces.set(
            nomGroupe,
            //@ts-ignore TS doesn't understand what happens with .filter
            espèces.map(e => {
                if(typeof e === 'string'){
                    return undefined
                }
    
                return espèceByCD_REF.get(e['CD_REF']) // may be undefined and that's ok
            })
            .filter(x => !!x)
        )
    }

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<SaisieEspèces>}
     */
    function mapStateToProps(state){
        const etresVivantsAtteints = importDescriptionMenacesEspècesFromURL(new URL(location.href), espèceByCD_REF, activites, methodes, transports)

        return {
            ...mapStateToSqueletteProps(state),
            espècesProtégéesParClassification,
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant,
            groupesEspèces,
            oiseauxAtteints: etresVivantsAtteints && etresVivantsAtteints['oiseau'] || [],
            faunesNonOiseauxAtteintes: etresVivantsAtteints && etresVivantsAtteints['faune non-oiseau'] || [],
            floresAtteintes: etresVivantsAtteints && etresVivantsAtteints['flore']|| [],
        }
    }


    const saisieEspèces = new SaisieEspèces({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(saisieEspèces, mapStateToProps)
}