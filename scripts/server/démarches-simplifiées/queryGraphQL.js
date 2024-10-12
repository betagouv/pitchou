//@ts-check

// ce script recups les dossier de la démarche 88444

import ky from 'ky';

import {dossiersQuery, GroupeInstructeursQuery, annotationCheckboxMutationQuery, annotationDateMutationQuery, annotationTextMutationQuery, deletedDossiersQuery, pendingDeletedDossiersQuery} from './graphQLqueries.js'

/** @import {demarcheQueryResult, demarcheQueryResultDemarche, AnnotationMutationResult} from '../../types/démarches-simplifiées/api.js' */

const ENDPOINT = 'https://www.demarches-simplifiees.fr/api/v2/graphql';

/**
 * @overload
 * @param {string} token
 * @param {GroupeInstructeursQuery} query
 * @param {{demarcheNumber: number}} variables
 * @returns {Promise<demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'groupeInstructeurs'>>>}
 */

/**
 * @overload
 * @param {string} token
 * @param {deletedDossiersQuery} query
 * @param {{demarcheNumber: number, last: number}} variables
 * @returns {Promise<demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'deletedDossiers'>>>}
 */

/**
 * @overload
 * @param {string} token
 * @param {pendingDeletedDossiersQuery} query
 * @param {{demarcheNumber: number, last: number}} variables
 * @returns {Promise<demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'pendingDeletedDossiers'>>>}
 */

/**
 * @overload
 * @param {string} token
 * @param {dossiersQuery} query
 * @param {{demarcheNumber: number, last: number, updatedSince: string, before?: string}} variables
 * @returns {Promise<demarcheQueryResult<Pick<demarcheQueryResultDemarche, 'dossiers'>>>}
 */

// Mutations

/**
 * @overload
 * @param {string} token
 * @param {annotationTextMutationQuery} query
 * @param {{dossierId: string, instructeurId: string, annotationId: string, clientMutationId: string, value: string}} variables
 * @returns {Promise<AnnotationMutationResult>}
 */

/**
 * @overload
 * @param {string} token
 * @param {annotationCheckboxMutationQuery} query
 * @param {{dossierId: string, instructeurId: string, annotationId: string, value: boolean}} variables
 * @returns {Promise<AnnotationMutationResult>}
 */

/**
 * @overload
 * @param {string} token
 * @param {annotationDateMutationQuery} query
 * @param {{dossierId: string, instructeurId: string, annotationId: string, value: string}} variables
 * @returns {Promise<AnnotationMutationResult>}
 */

/**
 * @param {string} token
 * @param {string} query
 * @param {Record<string, any>} variables
 * @returns {Promise<unknown>}
 */
export default async function(token, query, variables) {
    //console.log('graphQL query', query, variables)

    /** @type {{errors: any, data: unknown}} */
    let response 
    try{
        response = await ky.post(ENDPOINT, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: 20*1000,
            json: {
                query,
                variables
            }
        }).json();
        
        if (response.errors) {
            throw new Error(`Erreur graphQL ${JSON.stringify(response.errors, null, 2)}`)
        }
    
        return response.data;
    }
    catch(err){
        console.error('HTTP error', err)
        throw err
    }

    
}
