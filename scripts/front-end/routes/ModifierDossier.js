//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import ModifierDossier from '../components/screens/ModifierDossier.svelte';

export default ({params: {dossierId}}) => {
    /**
     * 
     * @param {import('../store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps({dossiers}){
        return {
            ...mapStateToSqueletteProps(store.state),
            dossier: dossiers[dossierId],
        }
    }   
    
    const modifierDossier = new ModifierDossier({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(modifierDossier, mapStateToProps)
}