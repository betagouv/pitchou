//@ts-check

import { json } from 'd3-fetch';

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import SuiviInstruction from '../components/screens/SuiviInstruction.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';

import { chargerDossiers, logout, secretFromURL } from '../actions/main.js';
import showLoginByEmail from './montrerPageDAccueil.js';
import { getURL } from '../getLinkURL.js';

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
                message: `Erreur de connexion - Votre lien de connexion n'est plus valide. Vous pouvez en recevoir un nouveau par email ci-dessous`
            })
        }
        else{
            logoutEtAfficherLoginParEmail({
                message: `Erreur de connexion - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`
            })
        }
    })

    // Ici, on est après init() et après secretFromURL()
    // Donc, soit on a des capabilities valides, soit on en n'a pas
    // Si on n'en a pas, afficher la page de connexion
    // Si on en a, charger des dossiers (s'il n'y a pas de dossiers dans le store)

    if(store.state.capabilities && store.state.capabilities.listerDossiers){
        if(store.state.dossiers.size === 0){
            await chargerDossiers()
                .catch(err => {
                    console.error('Problème de chargement des dossiers', err)
                    if(err.message.includes('403')){
                        logoutEtAfficherLoginParEmail({
                            message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
                        })
                    }
                    else{
                        logoutEtAfficherLoginParEmail({
                            message: `Erreur de chargement des dossiers - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`
                        })
                    }
                })
        }

        
        const activitésPrincipalesP = json(getURL('link#activités-principales-DS8844'))
        const activitésPrincipales = await activitésPrincipalesP

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
                relationSuivis: state.relationSuivis,
                activitésPrincipales
            }
        }    
        
        const suiviInstructeur = new SuiviInstruction({
            target: svelteTarget,
            props: mapStateToProps(store.state)
        });

        replaceComponent(suiviInstructeur, mapStateToProps)

    }
    else{
        if(store.state.capabilities && !store.state.capabilities.listerDossiers){
            store.mutations.ajouterErreur({
                message: `Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs sur la procédure Démarche Simplifiée de Pitchou. Vous pouvez prendre contact avec vos collègues ou l'équipe Pitchou pour être ajouté.e à un groupe d'instructeurs`
            })
        }

        showLoginByEmail()
    }
}
