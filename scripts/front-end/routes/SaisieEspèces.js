//@ts-check

import { json } from 'd3-fetch';

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import SaisieEspèces from '../components/screens/SaisieEspèces.svelte';

import { 
    importDescriptionMenacesEspècesFromURL,
    grouperEspècesParClassificationPourSaisieEspèce,
} from '../../commun/outils-espèces.js'
import {
    chargerActivitésMéthodesTransports, 
    chargerListeEspècesProtégées,
    chargerGroupesEspèces,
} from '../actions/main.js'

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */

export default async () => { 
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    const {
        espècesProtégéesParClassification: espècesProtégéesParClassificationAP,
        espèceByCD_REF,
    } = await espècesProtégées

    const groupesEspèces = await chargerGroupesEspèces(espèceByCD_REF)

    const {
        activités: activitesParClassificationSaisieEspèce,
        méthodes: méthodesParClassificationSaisieEspèce,
        transports: transportsParClassificationSaisieEspèce
    } = await actMétTrans
    
    const espècesProtégéesParClassificationSaisieEspèce = grouperEspècesParClassificationPourSaisieEspèce(espècesProtégéesParClassificationAP)
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<SaisieEspèces>}
     */
    function mapStateToProps(state){
        const etresVivantsAtteints = importDescriptionMenacesEspècesFromURL(
            new URL(location.href), 
            espèceByCD_REF, 
            [...activitesParClassificationSaisieEspèce.values()].flat(), 
            [...méthodesParClassificationSaisieEspèce.values()].flat(), 
            [...transportsParClassificationSaisieEspèce.values()].flat()
        )

        return {
            ...mapStateToSqueletteProps(state),
            espècesProtégéesParClassification: espècesProtégéesParClassificationSaisieEspèce,
            activitesParClassificationEtreVivant: activitesParClassificationSaisieEspèce, 
            méthodesParClassificationEtreVivant: méthodesParClassificationSaisieEspèce, 
            transportsParClassificationEtreVivant: transportsParClassificationSaisieEspèce,
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
