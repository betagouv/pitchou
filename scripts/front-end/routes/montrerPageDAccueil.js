//@ts-check

import LoginViaEmail from '../components/screens/LoginViaEmail.svelte';

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import {envoiEmailConnexion} from '../serveur.js'
import { authorizedEmailDomains } from '../../commun/constantes.js';

/** @import {PitchouState} from '../store.js' */
/** @import {ComponentProps} from 'svelte' */


export default function showLoginByEmail(){

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<LoginViaEmail>}
     */
    function mapStateToProps(state){
        return {
            erreurs: state.erreurs,
            authorizedEmailDomains,
            envoiEmailConnexion: envoiEmailConnexion
        }
    }

    replaceComponent(LoginViaEmail, mapStateToProps)
}