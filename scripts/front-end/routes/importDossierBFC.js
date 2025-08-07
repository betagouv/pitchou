//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossierBFC from '../components/screens/ImportDossierBFC.svelte';
import { chargerDossiers, secretFromURL } from '../actions/main.js';
import { mount } from "svelte";

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default async () => {
    try {

        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<ImportDossierBFC>}
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

            const StatsComponent = mount(ImportDossierBFC, {
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