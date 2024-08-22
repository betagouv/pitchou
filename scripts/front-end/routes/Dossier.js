//@ts-check

import page from 'page'
import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import Dossier from '../components/screens/Dossier.svelte';

/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */
/** @import {DossierComplet}  from '../../types.js' */

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default ({params: {dossierId}}) => {
    const id = Number(dossierId)
    const { state } = store
    const { dossiers } = state 

    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossiers) return page("/")

    const dossier = dossiers.get(/** @type {DossierId} */(id))
        
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