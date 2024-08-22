//@ts-check

import graphQLQuery from './queryGraphQL.js'

/** @import {GroupeInstructeurs} from "../../types/démarches-simplifiées/api.js" */

export const GroupeInstructeursQuery = `query ($demarcheNumber: Int!) {
    demarche(number: $demarcheNumber) {
        groupeInstructeurs {
            label
            instructeurs {
                id
                email
            }
        }
    }
}`

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


