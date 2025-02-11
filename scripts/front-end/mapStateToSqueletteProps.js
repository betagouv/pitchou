/** @import {PitchouState} from './store.js' */
/** @import {ComponentProps} from 'svelte' */

/** @import Squelette from './components/Squelette.svelte' */

/**
 * 
 * @param {PitchouState} state
 * @returns {ComponentProps<Squelette>}
*/
export const mapStateToSqueletteProps = (state) => {
    return {
        email: state.identité && state.identité.email,
        erreurs: state.erreurs,
        résultatsSynchronisationDS88444: state.résultatsSynchronisationDS88444
    }
}