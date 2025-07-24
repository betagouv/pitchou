//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossierHistorique from '../components/screens/ImportDossierHistorique.svelte';
import { secretFromURL } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */

export default async () => {
    try {
        /**
         * @param {PitchouState} state
         * @returns {ComponentProps<ImportDossierHistorique>}
         */
        function mapStateToProps(state) {
            const { email } = mapStateToSqueletteProps(state);
            return { email };
        }

        await secretFromURL().catch(err => { console.error(err) });

        const component = new ImportDossierHistorique({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(component, mapStateToProps);
    } catch (error) {
        console.error('Erreur lors du chargement de la page import-dossier-historique :', error)
    }
} 