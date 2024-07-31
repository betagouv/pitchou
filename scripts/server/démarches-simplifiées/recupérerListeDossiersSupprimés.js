//@ts-check

import queryGraphQL from './queryGraphQL.js'

// ne pas récupérer l'id https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10669
const deletedDossiersQuery = `query getDemarche(
  $demarcheNumber: Int!
  $deletedFirst: Int
  $deletedLast: Int
  $deletedBefore: String
  $deletedAfter: String
  $deletedSince: ISO8601DateTime
) {
  demarche(number: $demarcheNumber) {
    deletedDossiers(
      first: $deletedFirst
      last: $deletedLast
      before: $deletedBefore
      after: $deletedAfter
      deletedSince: $deletedSince
    ) {
      pageInfo {
        ...PageInfoFragment
      }
      nodes {
        ...DeletedDossierFragment
      }
    }
  }
}

fragment DeletedDossierFragment on DeletedDossier {
  number
  dateSupression
  state
  reason
}

fragment PageInfoFragment on PageInfo {
  hasPreviousPage
  hasNextPage
  startCursor
  endCursor
}`;

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

// ne pas récupérer l'id https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/10669
const pendingDeletedDossiersQuery = `query getDemarche(
    $demarcheNumber: Int!
    $deletedFirst: Int
    $deletedLast: Int
    $deletedBefore: String
    $deletedAfter: String
    $deletedSince: ISO8601DateTime
  ) {
    demarche(number: $demarcheNumber) {
      pendingDeletedDossiers (
        first: $deletedFirst
        last: $deletedLast
        before: $deletedBefore
        after: $deletedAfter
        deletedSince: $deletedSince
      ) {
        pageInfo {
          ...PageInfoFragment
        }
        nodes {
          ...DeletedDossierFragment
        }
      }
    }
  }
  
  fragment DeletedDossierFragment on DeletedDossier {
    number
    dateSupression
    state
    reason
  }
  
  fragment PageInfoFragment on PageInfo {
    hasPreviousPage
    hasNextPage
    startCursor
    endCursor
  }`;


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