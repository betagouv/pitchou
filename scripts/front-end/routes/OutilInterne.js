/** @import { ComponentProps } from 'svelte' */
/** @import { PitchouState } from '../store.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import OutilInterne from '../components/screens/OutilInterne.svelte';
import store from '../store.js';

export default async () => {
    try {
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<typeof OutilInterne>}
         */
        function mapStateToProps(state) {
            const { email, erreurs, résultatsSynchronisationDS88444 } = mapStateToSqueletteProps(state);
            return {
                email,
                erreurs,
                résultatsSynchronisationDS88444,
            };
        } 

        // Pour l'instant les personnes qui peuvent accéder à cette page sont les personnes avec la capability ListerDossier
        if (store.state.capabilities.listerDossiers) {
            replaceComponent(OutilInterne, mapStateToProps)
        } 
        else {
            store.mutations.ajouterErreur({message: `Il semblerait que vous n'aviez pas les droits pour accéder à cette page.`})
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la page Outil interne :', error)
    }
}

