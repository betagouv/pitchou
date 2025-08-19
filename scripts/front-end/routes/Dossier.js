//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import {getDossierComplet, chargerMessagesDossier} from '../actions/dossier.js'
import {chargerRelationSuivi} from '../actions/main.js'

//@ts-ignore
/** @import {ComponentProps} from 'svelte' */
//@ts-ignore
/** @import {PitchouState} from '../store.js' */
//@ts-ignore
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */

/**
 * @typedef {'instruction' | 'projet' | 'avis' | 'controles' | 'generation-document' | 'echanges'} Onglet
 */

/**
 * Typeguard pour valider qu'une chaîne est un onglet valide
 * @param {string} onglet 
 * @returns {onglet is Onglet}
 */
function isOngletValide(onglet) {
    return ['instruction', 'projet', 'echanges', 'avis', 'controles', 'generation-document'].includes(onglet)
}

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 * @param {string} [ctx.hash]
 */
export default async ({params: {dossierId}}) => {
    /** @type {DossierId} */
    // @ts-ignore
    const id = Number(dossierId)

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
     * @returns {ComponentProps<typeof Dossier>}
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)

        if(!dossier) throw new TypeError(`Dossier avec id '${id}' manquant dans le store`)

        const messages = state.messagesParDossierId.get(id)
        const relationSuivis = state.relationSuivis

        const hash = location.hash;
        const onglet = hash.slice('#'.length)

        /** @type {Onglet} */
        const ongletActifInitial = onglet && isOngletValide(onglet)
            ? onglet
            : "instruction";  

        // @ts-ignore
        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            messages,
            relationSuivis,
            ongletActifInitial,
        }
    }

    replaceComponent(Dossier, mapStateToProps)
}