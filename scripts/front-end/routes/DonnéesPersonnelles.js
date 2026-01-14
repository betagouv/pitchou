//@ts-check

/** @import {ComponentProps} from 'svelte' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import DonnéesPersonnelles from '../components/screens/DonnéesPersonnelles.svelte';

export default async () => {
    /**
     * 
     * @returns {ComponentProps<typeof DonnéesPersonnelles>}
     */ 
    function mapStateToProps() {
        return {};
    }

    replaceComponent(DonnéesPersonnelles, mapStateToProps)
}


