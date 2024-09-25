//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import LoginViaEmail from '../components/screens/LoginViaEmail.svelte';
import SuiviInstruction from '../components/screens/SuiviInstruction.svelte';

import {envoiEmailConnexion} from '../serveur.js'
import { authorizedEmailDomains } from '../../commun/constantes.js';
import { chargerDossiers, logout, secretFromURL } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */

function showLoginByEmail(){
    function mapStateToProps(){
        return {
            authorizedEmailDomains,
            envoiEmailConnexion: envoiEmailConnexion
        }
    }

    const loginViaEmail = new LoginViaEmail({
        target: svelteTarget,
        props: mapStateToProps()
    });

    replaceComponent(loginViaEmail, mapStateToProps)
}

export default async () => {
    console.info('route', '/')
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
            const dossiersById = state.dossiers || []

            return {
                ...mapStateToSqueletteProps(state),
                dossiers: [...dossiersById.values()],
                
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