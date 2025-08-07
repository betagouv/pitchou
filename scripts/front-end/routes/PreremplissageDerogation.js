//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import PreremplissageDerogation from '../components/screens/PreremplissageDerogation.svelte'
import { mount } from "svelte";

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */

export default () => {
    /**
     * 
     * @param {PitchouState} state
     * @returns {ComponentProps<PreremplissageDerogation>}
     */
    function mapStateToProps(state){
        if(!state.schemaDS88444){
            throw new TypeError('Schema 88444 manquant dans le store')
        }

        return {
            ...mapStateToSqueletteProps(state),
            schemaDS88444: state.schemaDS88444,
        }
    }   
    
    const preremplissageDerogation = mount(PreremplissageDerogation, {
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

    replaceComponent(preremplissageDerogation, mapStateToProps)

}