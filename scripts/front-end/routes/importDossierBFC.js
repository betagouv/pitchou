//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import store from '../store.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import ImportDossierBFC from '../components/screens/ImportDossierBFC.svelte';
import { chargerDossiers, secretFromURL } from '../actions/main.js';

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
            };
        }

        await secretFromURL()
            .catch(err => {
                console.error(err)
            })

        if (store.state.capabilities.listerDossiers) {
            await chargerDossiers()
                .catch(err => console.error({ err }))

            if (store.state.capabilities.listerPersonnes) {
                try {
                    const personnes = await store.state.capabilities.listerPersonnes()

                    const personnesMails = new Map()
                    for (const p of personnes) {
                        if (p.email) personnesMails.set(p.email, p.id)
                    }

                    replaceComponent(ImportDossierBFC, (state) => ({
                        ...mapStateToProps(state),
                        personnesMails,
                    }))
                } catch (err) {
                    console.error('Erreur chargement personnes', err)
                    replaceComponent(ImportDossierBFC, mapStateToProps)
                }
            } else {
                replaceComponent(ImportDossierBFC, mapStateToProps)
            }
        } else {
            console.error('store.state.capabilities.listerDossiers undefined')
        }

    } catch (error) {
        console.error('Erreur lors du chargement de la page import-dossier :', error)
    }
}