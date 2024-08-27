//@ts-check

import queryGraphQL from './queryGraphQL.js'

import {pendingDeletedDossiersQuery, deletedDossiersQuery} from './graphQLqueries.js'


/**
 * 
 * @param {string} token 
 * @param {number} demarcheNumber 
 * @returns 
 */
async function recupérerListeDeletedDossiers(token, demarcheNumber){
    const delDoss = await queryGraphQL(token, deletedDossiersQuery, {demarcheNumber, last: 100})
    
    return delDoss.demarche.deletedDossiers.nodes
}



/**
 * 
 * @param {string} token 
 * @param {number} demarcheNumber 
 * @returns 
 */
async function recupérerListePendingDeletedDossiers(token, demarcheNumber){
    const pendDelDoss = await queryGraphQL(token, pendingDeletedDossiersQuery, {demarcheNumber, last: 100})

    return pendDelDoss.demarche.pendingDeletedDossiers.nodes
}

/**
 * 
 * @param {string} token 
 * @param {number} demarcheNumber 
 * @returns 
 */
export default function récupérerTousLesDossiersSupprimés(token, demarcheNumber){
    return Promise.all([
        recupérerListeDeletedDossiers(token, demarcheNumber),
        recupérerListePendingDeletedDossiers(token, demarcheNumber)
    ])
    .then(res => res.flat(Infinity))
}