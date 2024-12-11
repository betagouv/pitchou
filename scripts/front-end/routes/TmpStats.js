//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import TmpStats from '../components/screens/TmpStats.svelte';

import { chargerDossiers } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/tmp/stats')
    
    if(store.state.dossiers.size === 0){
        await chargerDossiers()
    }

    const évènementsPhaseDossier = await store.state.capabilities?.listerÉvènementsPhaseDossier()


    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<TmpStats>}
     */
    function mapStateToProps(state){
        const dossiersById = state.dossiers

        return {
            ...mapStateToSqueletteProps(state),
            dossiers: [...dossiersById.values()],
            relationSuivis: state.relationSuivis,
            évènementsPhaseDossier
        }
    }    
    
    const suiviInstructeur = new TmpStats({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(suiviInstructeur, mapStateToProps)

}