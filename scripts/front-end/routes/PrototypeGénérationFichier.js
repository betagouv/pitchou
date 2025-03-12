//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import PrototypeGénérationFichier from '../components/screens/PrototypeGénérationFichier.svelte';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/prototype/generation-fichier')
    
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<PrototypeGénérationFichier>}
     */
    function mapStateToProps(state){
        return {
            ...mapStateToSqueletteProps(state)
        }
    }    
    
    const suiviInstructeur = new PrototypeGénérationFichier({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(suiviInstructeur, mapStateToProps)
}