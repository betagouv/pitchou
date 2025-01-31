//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import {getDossierComplet, chargerMessagesDossier} from '../actions/dossier.js'


/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default async ({params: {dossierId}}) => {
    /** @type {DossierId} */
    // @ts-ignore
    const id = Number(dossierId)
    const { state } = store
    
    // en attente de https://github.com/betagouv/pitchou/issues/154
    const messagesP = chargerMessagesDossier(id)
    const dossierP = getDossierComplet(id)

    const [dossier] = await Promise.all([dossierP, messagesP])


    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')
        
    /**
     * 
     * @param {PitchouState} state
     * @returns 
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)

        if(!dossier) throw new TypeError(`Dossier avec id '${id}' manquant dans le store`)

        const messages = state.messagesParDossierId.get(id)

        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            messages
        }
    }
    
    const pageDossier = new Dossier({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}