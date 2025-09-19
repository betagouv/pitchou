//@ts-check

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */
/** @import Personne from '../../types/database/public/Personne.js' */

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.svelte.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import Dossier from '../components/screens/Dossier.svelte';
import {getDossierComplet, chargerMessagesDossier} from '../actions/dossier.js'
import {chargerRelationSuivi} from '../actions/main.js'


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

        // Récupérer les emails des personnes qui suivent ce dossier
        /** @type {NonNullable<Personne['email']>[]} */
        let personnesQuiSuiventDossier = relationSuivis ? Array.from(relationSuivis)
                .filter(([, dossiersSuivis]) => dossiersSuivis.has(dossier.id))
                .map(([email]) => email)
            : []

        // Récupérer l'info de si oui ou non l'instructeurice suit ce dossier
        let dossiersSuiviParInstructeurActuel = relationSuivis && relationSuivis.get(mapStateToSqueletteProps(state)?.email ?? "")
        let dossierActuelSuiviParInstructeurActuel = dossiersSuiviParInstructeurActuel && dossiersSuiviParInstructeurActuel.has(dossier.id)

        // Récupérer l'info de l'onglet sélectionné
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
            ongletActifInitial,
            personnesQuiSuiventDossier,
            dossierActuelSuiviParInstructeurActuel,
        }
    }

    replaceComponent(Dossier, mapStateToProps)
}