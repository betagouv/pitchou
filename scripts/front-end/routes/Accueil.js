//@ts-check

import remember from 'remember';

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import SuiviInstruction from '../components/screens/SuiviInstruction.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';

import { chargerDossiers, logout, secretFromURL } from '../actions/main.js';
import showLoginByEmail from './montrerPageDAccueil.js';


/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */
/** @import {ChampDescriptor} from '../../types/démarches-simplifiées/schema.ts' */
/** @import {DossierDemarcheSimplifiee88444} from '../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {FiltresLocalStorage, TriTableau} from '../../types/interfaceUtilisateur.ts' */

const TRI_FILTRE_CLEF_LOCALSTORAGE = 'tri-filtres-tableau-suivi'

let trisFiltresSélectionnés = await remember(TRI_FILTRE_CLEF_LOCALSTORAGE)

/**
 * 
 * @param {PitchouState} state 
 * @returns {ComponentProps<SuiviInstruction>}
 */
function mapStateToPropsSuiviInstruction(state){
    if(!state.schemaDS88444){
        throw new TypeError('Schema 88444 manquant dans le store')
    }

    /** @type {ChampDescriptor[]} */
    const schemaChamps = state.schemaDS88444.revision.champDescriptors

    const activitésPrincipalesChamp = schemaChamps.find(champDescriptor => champDescriptor.label === "Activité principale")

    const dossiersById = state.dossiersRésumés

    // @ts-ignore
    return {
        ...mapStateToSqueletteProps(state),
        dossiers: [...dossiersById.values()],
        relationSuivis: state.relationSuivis,
        /** @type {DossierDemarcheSimplifiee88444["Activité principale"][] | undefined} */
        //@ts-expect-error TS ne sait pas que les activités principales possibles proviennent du schema
        activitésPrincipales: activitésPrincipalesChamp?.options,
        // @ts-ignore
        triIdSélectionné: trisFiltresSélectionnés?.tri,
        // @ts-ignore
        filtresSélectionnés: trisFiltresSélectionnés?.filtres,
        /**
         * 
         * @param {TriTableau} tri 
         * @param {Partial<FiltresLocalStorage>} filtres 
         */
        rememberTriFiltres(tri, filtres){
            const nouveauxTrisFiltresSélectionnés = {
                tri: tri.id,
                filtres: {
                    phases: filtres.phases ? [...filtres.phases] : undefined,
                    'prochaine action attendue de': filtres['prochaine action attendue de'] ? [...filtres['prochaine action attendue de']] : undefined,
                    instructeurs: filtres.instructeurs ? [...filtres.instructeurs] : undefined,
                    activitésPrincipales: filtres.activitésPrincipales ? [...filtres.activitésPrincipales] : undefined,
                }
            }

            remember(TRI_FILTRE_CLEF_LOCALSTORAGE, nouveauxTrisFiltresSélectionnés)

            trisFiltresSélectionnés = nouveauxTrisFiltresSélectionnés
        }
    }
} 


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

    if(store.state.capabilities.listerDossiers){
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
        
        const suiviInstructeur = new SuiviInstruction({
            target: svelteTarget,
            props: mapStateToPropsSuiviInstruction(store.state)
        });

        replaceComponent(suiviInstructeur, mapStateToPropsSuiviInstruction)

    }
    else{
        if(store.state.identité){
            // quelqu'un est connecté, mais n'a pas de capabilities pour lister des dossiers
            // cette personne fait sûrement parti d'un service instructeur, mais pas d'un groupe d'instructeur sur DS

            store.mutations.ajouterErreur({
                message: `Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs sur la procédure Démarche Simplifiée de Pitchou. Vous pouvez prendre contact avec vos collègues ou l'équipe Pitchou pour être ajouté.e à un groupe d'instructeurs`
            })
        }

        showLoginByEmail()
    }
}
