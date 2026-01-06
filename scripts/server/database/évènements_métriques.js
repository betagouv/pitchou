//@ts-check

import {directDatabaseConnection} from '../database.js'

/** @import { ÉvènementMétrique } from '../../types/évènement.js' */

/**
 * @param {string} cap
 * @param {ÉvènementMétrique} évènement
 */
export async function ajouterÉvènementDepuisCap(cap, évènement) {
    const personne = await directDatabaseConnection('cap_évènement_métrique')
        .select('id')
        .from('personne')
        .join('cap_évènement_métrique', {'cap_évènement_métrique.personne_cap': 'personne.code_accès'})
        .where({'cap_évènement_métrique.cap': cap})
        .first()

    if (!personne) {
        throw new Error('Pas de personne avec cette capability')
    }

    await directDatabaseConnection('évènement_métrique')
        .insert({ évènement: évènement.type, détails: évènement.détails, personne: personne.id })
}
