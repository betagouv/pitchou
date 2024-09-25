//@ts-check

import page from 'page'
import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToComponentProps.js';

import DossierMessagerie from '../components/screens/DossierMessagerie.svelte';
import { chargerDossiers } from '../actions/main.js';
import { chargerMessagesDossier } from '../actions/dossier.js';

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
    let { dossiers: dossierById } = state 

    let dossiersP;
    let messagesP;

    if (dossierById.size === 0){
        dossiersP = chargerDossiers()
    }
    else{
        dossiersP = dossierById
    }

    messagesP = chargerMessagesDossier(id)
    
    const [dossiers] = await Promise.all([dossiersP, messagesP])
        
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossiers.has(id)) return page('/')
        
    /**
     * 
     * @param {PitchouState} state 
     * @returns 
     */
    function mapStateToProps(state){
        const dossier = state.dossiers.get(id)
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