//@ts-check

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import PreremplissageDerogation from '../components/screens/PreremplissageDerogation.svelte'

export default () => {
    /**
     * 
     * @param {import('../store.js').PitchouState} _ 
     * @returns 
     */
    function mapStateToProps(){
        return {
            ...mapStateToSqueletteProps(store.state),
        }
    }   
    
    const preremplissageDerogation = new PreremplissageDerogation({
        target: svelteTarget,
        props: mapStateToProps(store.state)
    });

    replaceComponent(preremplissageDerogation, mapStateToProps)

}