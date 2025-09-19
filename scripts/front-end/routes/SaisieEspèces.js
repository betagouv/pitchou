//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import SaisieEspèces from '../components/screens/SaisieEspèces.svelte';

import { importDescriptionMenacesEspècesFromOdsArrayBuffer, importDescriptionMenacesEspècesFromURL } from '../../commun/outils-espèces.js';
import { chargerListeEspècesProtégées, chargerActivitésMéthodesTransports } from '../actions/activitésMéthodesTransports.js';

/** @import {ComponentProps} from 'svelte' */

/** @import {PitchouState} from '../store.js' */

export default async () => { 
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    const {espècesProtégéesParClassification, espèceByCD_REF} = await espècesProtégées

    const {
        activités: activitesParClassificationEtreVivant,
        méthodes: méthodesParClassificationEtreVivant,
        transports: transportsParClassificationEtreVivant
    } = await actMétTrans

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<typeof SaisieEspèces>}
     */
    function mapStateToProps(state){
        const etresVivantsAtteints = importDescriptionMenacesEspècesFromURL(
            new URL(location.href), 
            espèceByCD_REF, 
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant
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
                activitesParClassificationEtreVivant, 
                méthodesParClassificationEtreVivant, 
                transportsParClassificationEtreVivant
            )
        }
        


        return {
            ...mapStateToSqueletteProps(state),
            espècesProtégéesParClassification,
            activitesParClassificationEtreVivant, 
            méthodesParClassificationEtreVivant, 
            transportsParClassificationEtreVivant,
            importDescriptionMenacesEspècesFromOds,
            oiseauxAtteints: etresVivantsAtteints && etresVivantsAtteints['oiseau'] || [],
            faunesNonOiseauxAtteintes: etresVivantsAtteints && etresVivantsAtteints['faune non-oiseau'] || [],
            floresAtteintes: etresVivantsAtteints && etresVivantsAtteints['flore']|| [],
        }
    }

    replaceComponent(SaisieEspèces, mapStateToProps)
}