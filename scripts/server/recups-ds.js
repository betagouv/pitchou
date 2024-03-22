//@ts-check

// ce script recups les dossier de la démarche 88444

import ky from 'ky';
import { formatISO } from 'date-fns';

const ENDPOINT = 'https://www.demarches-simplifiees.fr/api/v2/graphql';

const QUERY = `
  query getDemarche(
    $demarcheNumber: Int!
    $last: Int
    $after: String
    $updatedSince: ISO8601DateTime
    $includeDossiers: Boolean = true
    $includeGroupeInstructeurs: Boolean = true
  ) {
    demarche(number: $demarcheNumber) {
      dossiers(
        last: $last
        after: $after
        updatedSince: $updatedSince
      ) @include(if: $includeDossiers) {
        pageInfo {
          ...PageInfoFragment
        }
        nodes {
          id
          dateDerniereModification
        }
        pageInfo {
          endCursor
          hasNextPage
        }
      }
    }
  }

  fragment PageInfoFragment on PageInfo {
    hasPreviousPage
    hasNextPage
    endCursor
  }
`;

async function requestPage() {
  const response = await ky.post(ENDPOINT, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.API_TOKEN}`
    },
    json: {
      query: QUERY,
      variables: {
        demarcheNumber: parseInt(process.env.DEMARCHE_NUMBER),
        last: 100,
        updatedSince: formatISO(new Date(2020, 1, 22))
      }
    }
  }).json();

  return response;
}

async function main() {
  try {
    const data = await requestPage();
    const dossiers = data.data.demarche.dossiers.nodes;
    const dossierIds = dossiers.map(dossier => dossier.id).join(', ');
    console.log(`Info: fetched dossiers ids: ${dossierIds}`);
    console.log(`Debug: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
