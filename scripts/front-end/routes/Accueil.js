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
/** @import {ChampDescriptor} from '../../types/démarches-simplifiées/schema.ts' */
/** @import {DossierDemarcheSimplifiee88444} from '../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
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
        if(store.state.dossiersRésumés.size === 0){
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

        if(!store.state.schemaDS88444){
            throw new TypeError('Schema 88444 manquant dans le store')
        }

        /** @type {ChampDescriptor[]} */
        const schemaChamps = store.state.schemaDS88444.revision.champDescriptors

        const activitésPrincipalesChamp = schemaChamps.find(champDescriptor => champDescriptor.label === "Activité principale")

        /**
         * 
         * @param {PitchouState} state 
         * @returns {ComponentProps<SuiviInstruction>}
         */
        function mapStateToProps(state){
            const dossiersById = state.dossiersRésumés

            // @ts-ignore
            return {
                ...mapStateToSqueletteProps(state),
                dossiers: [...dossiersById.values()],
                relationSuivis: state.relationSuivis,
                /** @type {DossierDemarcheSimplifiee88444["Activité principale"][] | undefined} */
                //@ts-expect-error TS ne sait pas que les activités principales possibles proviennent du schema
                activitésPrincipales: activitésPrincipalesChamp?.options,
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
