//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import ModifierDossier from '../components/screens/ModifierDossier.svelte';

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default ({params: {dossierId}}) => {
    /**
     * 
     * @param {import('../store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps({dossiers}){
        return {
            ...mapStateToSqueletteProps(store.state),
            //@ts-ignore
            dossier: dossiers.get(Number(dossierId)),
        }
    }   
    
    const modifierDossier = new ModifierDossier({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(modifierDossier, mapStateToProps)
}