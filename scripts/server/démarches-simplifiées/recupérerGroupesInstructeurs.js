//@ts-check

import graphQLQuery from './queryGraphQL.js'

/** @import {GroupeInstructeurs} from '../../types/démarches-simplifiées/apiSchema.ts' */

import {GroupeInstructeursQuery} from './graphQLqueries.js'
import { normalisationEmail } from '../../commun/manipulationStrings.js'


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
