//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import Stats from '../components/screens/Stats.svelte';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/stats')
    
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<Stats>}
     */
function mapStateToProps(state) {
    const { email } = mapStateToSqueletteProps(state);
    return { email };
}  
    
    const StatsComponent = new Stats({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(StatsComponent, mapStateToProps)

}