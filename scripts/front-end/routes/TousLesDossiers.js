/** @import { PitchouState } from '../store.js' */
/** @import { ComponentProps } from 'svelte' */
/** @import { DossierRésumé } from '../../types/API_Pitchou.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import TousLesDossiers from '../components/screens/TousLesDossiers.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';
import { chargerDossiers } from '../actions/dossier.js';
import store from '../store.js';


export default async () => {
    replaceComponent(SqueletteContenuVide, () => {})

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<typeof TousLesDossiers>}
     */
    function mapStateToProps(state) {
        /** @type {DossierRésumé[]} */
        const dossiers = [...state.dossiersRésumés.values()]
        
        const { email, erreurs } = mapStateToSqueletteProps(state);
        
        return {
            email,
            dossiers,
            relationSuivis: state.relationSuivis,
            erreurs
        };
    }

    try {
        await chargerDossiers()
        replaceComponent(TousLesDossiers, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page Tous les dossiers :', error)
        
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if(errorMessage.includes('403')){
            store.mutations.ajouterErreur({
                message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
            })
        }
        else{
            store.mutations.ajouterErreur({
                message: `Erreur de chargement des dossiers - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`
            })
        }

        // Afficher le composant même en cas d'erreur pour que l'utilisateur voie le message d'erreur
        replaceComponent(TousLesDossiers, mapStateToProps)
    }
}