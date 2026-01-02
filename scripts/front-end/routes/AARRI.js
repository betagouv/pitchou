/** @import { ComponentProps } from 'svelte' */
/** @import { PitchouState } from '../store.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import AARRI from '../components/screens/AARRI.svelte';

export default async () => {
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<typeof AARRI>}
     */
    function mapStateToProps(state) {
        const props = mapStateToSqueletteProps(state);
        // le type de ComponentProps<typeof Squelette> imposent que les propriétés props sont peut-être undefined
        // @ts-ignore
        return props;
    } 

    replaceComponent(AARRI, mapStateToProps)
}

