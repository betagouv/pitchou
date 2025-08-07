//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import store from '../store.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import TmpStats from '../components/screens/TmpStats.svelte';

import { chargerDossiers } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/tmp/stats')
    
    if(store.state.dossiersRésumés.size === 0){
        await chargerDossiers()
    }

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<TmpStats>}
     */
    function mapStateToProps(state){
        const dossiersById = state.dossiersRésumés

        return {
            ...mapStateToSqueletteProps(state),
            dossiers: [...dossiersById.values()]
        }
    }    

    replaceComponent(TmpStats, mapStateToProps)

}