//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import RedactionArretePrefectoral from '../components/screens/RedactionArretePrefectoral.svelte';
import { chargerActivitésMéthodesTransports, chargerDossiers, chargerListeEspècesProtégées } from '../actions/main.js';

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default async ({params: {dossierId}}) => {
    /** @type {DossierId} */
    // @ts-ignore
    const id = Number(dossierId)
    const { state } = store
    let { dossiers } = state 

    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    if (dossiers.size === 0){
        dossiers = await chargerDossiers()
    }

    const dossier = dossiers.get(id)
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
    
    const {espèceByCD_REF} = await espècesProtégées
    const { activités, méthodes, transports } = await actMétTrans

    /**
     * 
     * @param {PitchouState} state
     * @returns {ComponentProps<RedactionArretePrefectoral>}
     */
    function mapStateToProps(state){
        if (!dossier)
            throw new TypeError('Dossier manquant')

        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            espèceByCD_REF,
            activités,
            méthodes,
            transports
        }
    }   
    
    const redactionArretePrefectoral = new RedactionArretePrefectoral({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(redactionArretePrefectoral, mapStateToProps)
}