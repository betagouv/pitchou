//@ts-check

import { json } from 'd3-fetch';

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import SaisieEspèces from '../components/screens/SaisieEspèces.svelte';

import { importDescriptionMenacesEspècesFromOdsArrayBuffer, importDescriptionMenacesEspècesFromURL } from '../../commun/outils-espèces.js';
import { getURL } from '../getLinkURL.js';
import {chargerActivitésMéthodesTransports, chargerListeEspècesProtégées} from '../actions/main.js'

/** @import {ComponentProps} from 'svelte' */

/** @import { EspèceProtégée, GroupesEspèces, NomGroupeEspèces } from "../../types/especes.d.ts" */
/** @import {PitchouState} from '../store.js' */

export default async () => { 
    /** @type {Promise<GroupesEspèces | undefined>} */
    const groupesEspècesBrutesP = json(getURL('link#groupes-especes-data'))
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    const groupesEspècesBrutes = await groupesEspècesBrutesP

    if(!groupesEspècesBrutes){
        throw new TypeError(`groupesEspècesBrutes manquants`)
    }

    const {espècesProtégéesParClassification, espèceByCD_REF} = await espècesProtégées

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

    const {
        activités: activitesParClassificationEtreVivant,
        méthodes: méthodesParClassificationEtreVivant,
        transports: transportsParClassificationEtreVivant
    } = await actMétTrans

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<SaisieEspèces>}
     */
    function mapStateToProps(state){
        const etresVivantsAtteints = importDescriptionMenacesEspècesFromURL(
            new URL(location.href), 
            espèceByCD_REF, 
            [...activitesParClassificationEtreVivant.values()].flat(), 
            [...méthodesParClassificationEtreVivant.values()].flat(), 
            [...transportsParClassificationEtreVivant.values()].flat()
        )

        /**
         * 
         * @param {ArrayBuffer} odsArrayBuffer 
         * @returns 
         */
        function importDescriptionMenacesEspècesFromOds(odsArrayBuffer){
            return importDescriptionMenacesEspècesFromOdsArrayBuffer(
                odsArrayBuffer, 
                espèceByCD_REF, 
                [...activitesParClassificationEtreVivant.values()].flat(), 
                [...méthodesParClassificationEtreVivant.values()].flat(), 
                [...transportsParClassificationEtreVivant.values()].flat()
            )
        }
        


        return {
            ...mapStateToSqueletteProps(state),
            espècesProtégéesParClassification,
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant,
            importDescriptionMenacesEspècesFromOds,
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