//@ts-check

import graphQLQuery from './queryGraphQL.js'

import {GroupeInstructeursQuery} from './graphQLqueries.js'

//@ts-ignore erreur incompréhensible
/** @import {GroupeInstructeurs} from '../../types/démarches-simplifiées/api.js' */

/**
 * 
 * @param {string} token 
 * @param {number} demarcheNumber 
 * @returns {Promise<GroupeInstructeurs[]>}
 */
export async function recupérerGroupesInstructeurs(token, demarcheNumber) {
    const res = await graphQLQuery(token, GroupeInstructeursQuery, {demarcheNumber})
    return res.demarche.groupeInstructeurs
}


