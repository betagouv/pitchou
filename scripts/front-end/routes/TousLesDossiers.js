/** @import { PitchouState } from '../store.js' */
/** @import { ComponentProps } from 'svelte' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import TousLesDossiers from '../components/screens/TousLesDossiers.svelte';


export default async () => {
    try {
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<typeof TousLesDossiers>}
         */
        function mapStateToProps(state) {
            const { email } = mapStateToSqueletteProps(state);
            return {
                email
            };
        }  

        replaceComponent(TousLesDossiers, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page Tous les dossiers :', error)
    }
}