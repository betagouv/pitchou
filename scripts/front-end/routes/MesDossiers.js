/** @import { PitchouState } from '../store.js' */
/** @import { ComponentProps } from 'svelte' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import MesDossiers from '../components/screens/MesDossiers.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';
import store from '../store.js';


export default async () => {
    replaceComponent(SqueletteContenuVide, () => {})

    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<typeof MesDossiers>}
     */
    function mapStateToProps(state) {
        const { email, erreurs, résultatsSynchronisationDS88444 } = mapStateToSqueletteProps(state);
        
        return {
            email,
            erreurs,
            résultatsSynchronisationDS88444
        };
    }

    try {
        replaceComponent(MesDossiers, mapStateToProps)
    } catch (error) {
        console.error('Erreur lors du chargement de la page Mes dossiers :', error)
        
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if(errorMessage.includes('403')){
            store.mutations.ajouterErreur({
                message: `Erreur de connexion - Votre lien de connexion n'est plus valide, vous pouvez en recevoir par email ci-dessous`
            })
        }
        else{
            store.mutations.ajouterErreur({
                message: `Erreur de chargement de la page - Il s'agit d'un problème technique. Vous pouvez en informer l'équipe Pitchou`
            })
        }

        // Afficher le composant même en cas d'erreur pour que l'utilisateur voie le message d'erreur
        replaceComponent(MesDossiers, mapStateToProps)
    }
}

