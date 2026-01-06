/** @import { ComponentProps } from 'svelte' */
/** @import { PitchouState } from '../store.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import AARRI from '../components/screens/AARRI.svelte';
import { chargerIndicateursAARRI } from '../actions/aarri.js';

export default async () => {
    try {
        const indicateursP = chargerIndicateursAARRI()
        
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<typeof AARRI>}
         */
        function mapStateToProps(state) {
            const { email, erreurs, résultatsSynchronisationDS88444 } = mapStateToSqueletteProps(state);
            return {
                email,
                erreurs,
                résultatsSynchronisationDS88444,
                indicateursParDateP: indicateursP
            };
        } 

        replaceComponent(AARRI, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page AARRI :', error)
    }
}

