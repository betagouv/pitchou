/** @import { PitchouState } from '../store.js' */
/** @import { ComponentProps } from 'svelte' */
/** @import { DossierRésumé } from '../../types/API_Pitchou.js' */

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import MesDossiers from '../components/screens/MesDossiers.svelte';
import SqueletteContenuVide from '../components/SqueletteContenuVide.svelte';
import { chargerDossiers } from '../actions/dossier.js';
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
        
        /** @type {DossierRésumé[]} */
        const tousLesDossiers = [...state.dossiersRésumés.values()]
        
        // Filtrer pour ne garder que les dossiers suivis par l'instructeur actuel
        /** @type {DossierRésumé[]} */
        const dossiers = email && state.relationSuivis
            ? tousLesDossiers.filter(dossier => {
                const dossiersSuivis = state.relationSuivis?.get(email)
                return dossiersSuivis && dossiersSuivis.has(dossier.id)
            })
            : []
        
        return {
            email,
            dossiers,
            relationSuivis: state.relationSuivis,
            erreurs,
            résultatsSynchronisationDS88444
        };
    }

    try {
        await chargerDossiers()
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

