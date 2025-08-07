//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import PreremplissageDerogation from '../components/screens/PreremplissageDerogation.svelte'

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

    replaceComponent(PreremplissageDerogation, mapStateToProps)

}