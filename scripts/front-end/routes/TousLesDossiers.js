/** @import { PitchouState } from '../store.js' */
/** @import { ComponentProps } from 'svelte' */
/** @import { DossierRésumé } from '../../types/API_Pitchou.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import TousLesDossiers from '../components/screens/TousLesDossiers.svelte';
import { chargerDossiers } from '../actions/dossier.js';


export default async () => {
    try {

        await chargerDossiers()

        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<typeof TousLesDossiers>}
         */
        function mapStateToProps(state) {
            /** @type {DossierRésumé[]} */
            const dossiers = [...state.dossiersRésumés.values()]

            console.log('dossiers dans TousLesDossiers.js', dossiers, state)
            
            const { email } = mapStateToSqueletteProps(state);
            return {
                email,
                dossiers,
            };
        }  

        replaceComponent(TousLesDossiers, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page Tous les dossiers :', error)
    }
}