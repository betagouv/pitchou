//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import SuiviInstruction from '../components/screens/SuiviInstruction.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';

import { chargerDossiers, logout, secretFromURL } from '../actions/main.js';
import showLoginByEmail from './montrerPageDAccueil.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */



export default async () => {
    console.info('route', '/')

    replaceComponent(new SqueletteContenuVide({target: svelteTarget}), () => {})

    /**
     * 
     * @param {{message: string}} [erreur]
     * @returns 
     */
    function logoutEtAfficherLoginParEmail(erreur){
        if(erreur){
            store.mutations.ajouterErreur(erreur)
        }

        return logout().then(showLoginByEmail)
    }


    await secretFromURL()
    .catch(err => {
        if(err.message.includes('403')){
            logoutEtAfficherLoginParEmail({
                message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
            })
        }
        else{
            logoutEtAfficherLoginParEmail({
                message: `Erreur de connexion - Il s'agit sûrement d'une erreur technique. Vous pouvez en informer l'équipe Pitchou`
            })
        }
    })

    if(store.state.dossiers.size === 0){
        await chargerDossiers()
            .catch(err => {
                if(err.message.includes('403')){
                    store.mutations.ajouterErreur({
                        message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
                    })
                    logout().then(showLoginByEmail)
                }
                else{
                    console.error('Erreur de chargement des dossiers', err)
                }
            })
    }

    if(store.state.dossiers && store.state.dossiers.size > 0){
        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<SuiviInstruction>}
         */
        function mapStateToProps(state){
            const dossiersById = state.dossiers

            return {
                ...mapStateToSqueletteProps(state),
                dossiers: [...dossiersById.values()],
                relationSuivis: state.relationSuivis
            }
        }    
        
        const suiviInstructeur = new SuiviInstruction({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(suiviInstructeur, mapStateToProps)

    }
    else{
        throw `PPP des fois, l'utilisateur n'a pas encore de dossier, il faudrait lui afficher un tableau vide`
        showLoginByEmail()
    }
}