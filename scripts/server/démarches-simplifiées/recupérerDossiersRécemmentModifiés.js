//@ts-check

// ce script recups les dossier de la démarche 88444

import { formatISO } from 'date-fns';

import queryGraphQL from './queryGraphQL.js'
import {dossiersQuery} from './graphQLqueries.js'


/**
 * @param {string} token
 * @param {number} demarcheNumber
 * @param {Date} updatedSince
 * @param {string} [before]
 * @returns {Promise<any>}
 */
function récupérerPageDossiersRécemmentModifiés(token, demarcheNumber, updatedSince, before) {
    return queryGraphQL(token, dossiersQuery, {
        demarcheNumber,

        last: 100,
        updatedSince: formatISO(updatedSince),
        before
    })
}


/** @typedef {any} DossierAPI */

/**
 * @param {string} token
 * @param {number} demarcheNumber
 * @param {Date} updatedSince
 * @returns {Promise<any>}
 */
export async function recupérerDossiersRécemmentModifiés(token, demarcheNumber, updatedSince) {
    /** @type {any[]} */
    let dossiers = []
    let hasPreviousPage = true;
    let startCursor = undefined

    while (hasPreviousPage) {
        
        const page = await récupérerPageDossiersRécemmentModifiés(token, demarcheNumber, updatedSince, startCursor)

        const pageDossiers = page.demarche.dossiers.nodes

        dossiers = pageDossiers.concat(dossiers)

        if(dossiers.length >= 100){
            console.log('dossiers récupérés jusque-là', dossiers.length)
        }

        const pageInfo = page.demarche.dossiers.pageInfo;

        hasPreviousPage = pageInfo.hasPreviousPage
        startCursor = pageInfo.startCursor
    }

    return dossiers;
}


