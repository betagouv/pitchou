//@ts-check

import graphQLQuery from './queryGraphQL.js'

import {GroupeInstructeursQuery} from './graphQLqueries.js'
import { normalisationEmail } from '../../commun/manipulationStrings.js'

//@ts-ignore erreur incompréhensible
/** @import {GroupeInstructeurs} from '../../types/démarches-simplifiées/apiSchema.ts' */

/**
 *
 * @param {string} token
 * @param {number} demarcheNumber
 * @returns {Promise<GroupeInstructeurs[]>}
 */
export async function recupérerGroupesInstructeurs(token, demarcheNumber) {
    const res = await graphQLQuery(token, GroupeInstructeursQuery, {demarcheNumber})
    const groupeInstructeurs = res.demarche.groupeInstructeurs;

    for (const group of groupeInstructeurs) {
        for (const instructeur of group.instructeurs) {
            instructeur.email = normalisationEmail(instructeur.email)
        }
    }

    return groupeInstructeurs
}
