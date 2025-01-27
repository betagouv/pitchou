//@ts-check

import page from 'page'
import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import DossierProcédure from '../components/screens/DossierProcédure.svelte';
import { getDossierComplet } from '../actions/dossier.js';

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

// `https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`

/**
 * @param { {params: {dossierId: string}} } _
 */
export default async({params: {dossierId}}) => {
    /** @type {DossierId} */
    //@ts-ignore
    const id = Number(dossierId)
    const { state } = store
    
    const dossier = await getDossierComplet(id)
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<DossierProcédure>}
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)
        
        if(!dossier) throw new TypeError(`Dossier avec id '${id}' manquant dans le store`)

        return {
            ...mapStateToSqueletteProps(state),
            dossier,
        }
    }   
    
    const pageDossier = new DossierProcédure({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}