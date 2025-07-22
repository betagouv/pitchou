//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossier from '../components/screens/ImportDossier.svelte';
import { chargerDossiers, secretFromURL } from '../actions/main.js';


/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    try {

        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<ImportDossier>}
         */
        function mapStateToProps(state) {
            const dossiersById = state.dossiersRésumés
            const { email } = mapStateToSqueletteProps(state);
            const dossiers = [...dossiersById.values()]

            return {
                email,
                dossiers,
            };
        }

        await secretFromURL()
            .catch(err => {
                console.error(err)
            })

        if (store.state.capabilities.listerDossiers) {
            await chargerDossiers()
                .catch(err => console.error({ err }))

            const StatsComponent = new ImportDossier({
                target: svelteTarget,
                props: mapStateToProps(store.state)
            });

            replaceComponent(StatsComponent, mapStateToProps)
        } else {
            console.error('store.state.capabilities.listerDossiers undefined')
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la page import-dossier :', error)
    }
}