//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import LoginViaEmail from '../components/screens/LoginViaEmail.svelte';
import SuiviInstruction from '../components/screens/SuiviInstruction.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';

import {envoiEmailConnexion} from '../serveur.js'
import { authorizedEmailDomains } from '../../commun/constantes.js';
import { chargerDossiers, logout, secretFromURL } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */

function showLoginByEmail(){
    /**
     * 
     * @param {PitchouState} state 
     * @returns 
     */
    function mapStateToProps(state){
        return {
            erreurs: state.erreurs,
            authorizedEmailDomains,
            envoiEmailConnexion: envoiEmailConnexion
        }
    }

    const loginViaEmail = new LoginViaEmail({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(loginViaEmail, mapStateToProps)
}

export default async () => {
    console.info('route', '/')

    replaceComponent(new SqueletteContenuVide({target: svelteTarget}), () => {})

    await secretFromURL()
    if(store.state.dossiers.size === 0){
        await chargerDossiers()
            .catch(err => {
                if(err.message.includes('403')){
                    console.info('Invalid token. Logout.')
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
        showLoginByEmail()
    }
}