//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossier from '../components/screens/ImportDossier.svelte';


/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    console.info('route', '/import-dossier')
    
    try {
        
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<ImportDossier>}
         */
        function mapStateToProps(state) {
            const { email } = mapStateToSqueletteProps(state);
            return {
                email
            };
        }  
        
        const StatsComponent = new ImportDossier({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(StatsComponent, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page import-dossier :', error)
    }
}