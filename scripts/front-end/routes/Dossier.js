//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import { chargerDossiers } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */
/** @import {DossierComplet}  from '../../types.js' */

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

    if (!dossiers){
        dossiers = await chargerDossiers()
    }

    const dossier = dossiers.get(id)
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {DossierComplet} dossier
     * @returns 
     */
    function getMapStateToProps(dossier){
        return (/** @type {PitchouState} */state) => ({
            ...mapStateToSqueletteProps(state),
            dossier,
        })
    }   
    
    const pageDossier = new Dossier({
        target: svelteTarget,
        props: getMapStateToProps(dossier)(state),
    });

    replaceComponent(pageDossier, getMapStateToProps(dossier))
}