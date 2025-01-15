//@ts-check

import page from 'page'
import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';

import DossierMessagerie from '../components/screens/DossierMessagerie.svelte';
import { chargerMessagesDossier, getDossierComplet } from '../actions/dossier.js';

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
    
    const dossierP = getDossierComplet(id)
    // en attente de https://github.com/betagouv/pitchou/issues/154
    const messagesP = chargerMessagesDossier(id)
    
    const [dossier] = await Promise.all([dossierP, messagesP])
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {PitchouState} state 
     * @returns {ComponentProps<DossierMessagerie>}
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)
        const messages = state.messagesParDossierId.get(id)

        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            messages
        }
    }   
    
    const pageDossier = new DossierMessagerie({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}