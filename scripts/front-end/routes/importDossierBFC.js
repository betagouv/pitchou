//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import store from '../store.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossierBFC from '../components/screens/ImportDossierBFC.svelte';
import { secretFromURL } from '../actions/main.js';
import { chargerDossiers } from '../actions/dossier.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    try {

        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<typeof ImportDossierBFC>}
         */
        function mapStateToProps(state) {
            const dossiersById = state.dossiersRésumés
            const { email } = mapStateToSqueletteProps(state);
            const dossiers = [...dossiersById.values()]

            return {
                email,
                dossiers,
                schema: state.schemaDS88444 
            };
        }

        await secretFromURL()
            .catch(err => {
                console.error(err)
            })

        if (store.state.capabilities.listerDossiers) {
            await chargerDossiers()
                .catch(err => console.error({ err }))

            replaceComponent(ImportDossierBFC, mapStateToProps)
        } else {
            console.error('store.state.capabilities.listerDossiers undefined')
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la page import-dossier :', error)
    }
}