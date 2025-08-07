//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import Stats from '../components/screens/Stats.svelte';
import { chargerStats } from '../actions/stats.js';
import { mount } from "svelte";

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/stats')
    
    try {
        const statsP = chargerStats()
        
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<Stats>}
         */
        function mapStateToProps(state) {
            const { email, erreurs } = mapStateToSqueletteProps(state);
            return {
                email,
                statsP,
                erreurs
            };
        }  
        
        const StatsComponent = mount(Stats, {
                    target: svelteTarget,
                    props: mapStateToProps(store.state)
                });

        replaceComponent(StatsComponent, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement des stats :', error)
    }
}