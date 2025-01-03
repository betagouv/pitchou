//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import { chargerDossiers } from '../actions/main.js';

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

    if (dossiers.size === 0){
        dossiers = await chargerDossiers()
    }

    const dossier = dossiers.get(id)
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {PitchouState} state
     * @returns 
     */
    function mapStateToProps(state){
        return {
            ...mapStateToSqueletteProps(state),
            dossier
        }
    }
    
    const pageDossier = new Dossier({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}