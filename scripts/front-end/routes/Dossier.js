//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import {getDossierComplet, chargerMessagesDossier} from '../actions/dossier.js'
import {chargerRelationSuivi} from '../actions/main.js'

/** @import {ComponentProps} from 'svelte' */

/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 * @param {string} [ctx.params.onglet]
 */
export default async ({params: {dossierId, onglet}}) => {
    /** @type {DossierId} */
    // @ts-ignore
    const id = Number(dossierId)
    const { state } = store
    
    // en attente de https://github.com/betagouv/pitchou/issues/154
    const messagesP = chargerMessagesDossier(id)
    const dossierP = getDossierComplet(id)
    const relationSuiviP = chargerRelationSuivi()

    const [dossier] = await Promise.all([dossierP, messagesP, relationSuiviP])


    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')

    /**
     * 
     * @param {PitchouState} state
     * @returns {ComponentProps<Dossier>}
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)

        if(!dossier) throw new TypeError(`Dossier avec id '${id}' manquant dans le store`)

        const messages = state.messagesParDossierId.get(id)
        const relationSuivis = state.relationSuivis

        const ongletActif = onglet && ['instruction', 'projet', 'echanges', 'avis', 'controles', 'generation-document'].includes(onglet)
            ? (onglet)
            : ("instruction");

        // @ts-ignore
        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            messages,
            relationSuivis,
            ongletActif,
        }
    }
    
    const pageDossier = new Dossier({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(pageDossier, mapStateToProps)
}