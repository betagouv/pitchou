//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import Stats from '../components/screens/Stats.svelte';
import { chargerDossiers } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/stats')
    
    // Charger les dossiers si ils ne sont pas déjà chargés
    if(store.state.dossiersRésumés.size === 0){
        await chargerDossiers()
    }

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<Stats>}
     */
    function mapStateToProps(state) {
        const dossiersById = state.dossiersRésumés
        const { email } = mapStateToSqueletteProps(state);
        return {
            email,
            dossiers: [...dossiersById.values()]
        };
    }  
    
    const StatsComponent = new Stats({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(StatsComponent, mapStateToProps)

}