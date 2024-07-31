//@ts-check

/** @import {demarcheQueryResult, demarcheQueryResultDemarche, GroupeInstructeurs} from "../../types/démarches-simplifiées/api.js" */

import graphQLQuery from './queryGraphQL.js'

const GroupeInstructeursQuery = `query ($demarcheNumber: Int!) {
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
    /** @type {demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'groupeInstructeurs'>>} */
    const res = await graphQLQuery(token, GroupeInstructeursQuery, {demarcheNumber})

    return res.demarche.groupeInstructeurs
}


