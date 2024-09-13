//@ts-check

import page from 'page'
import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import DossierMessagerie from '../components/screens/DossierMessagerie.svelte';
import { chargerDossiers } from '../actions/main.js';

/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

// `https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default async({params: {dossierId}}) => {
    const id = Number(dossierId)
    const { state } = store
    let { dossiers } = state 

    if (!dossiers){
        dossiers = await chargerDossiers()
    }

    // temporaire, en attendant le merge de https://github.com/betagouv/pitchou/pull/82
    if(Array.isArray(dossiers)){
        const _dossiers = new Map()
        for(const d of dossiers){
            _dossiers.set(d.id, d)
        }
        dossiers = _dossiers
    }

    const dossier = dossiers.get(/** @type {DossierId} */(id))
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {PitchouState} state 
     * @returns 
     */
    function mapStateToProps(state){
        return {
            ...mapStateToSqueletteProps(state),
            dossier,
        }
    }   
    
    const pageDossier = new DossierMessagerie({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}