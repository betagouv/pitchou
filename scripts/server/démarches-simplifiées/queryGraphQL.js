//@ts-check

// ce script recups les dossier de la démarche 88444

import ky from 'ky';

const ENDPOINT = 'https://www.demarches-simplifiees.fr/api/v2/graphql';

/**
 * @param {string} token
 * @param {string} query
 * @param {Record<string, any>} variables
 * @returns {Promise<any>}
 */
export default async function(token, query, variables) {
    /** @type {{errors: any, data: any}} */
    const response = await ky.post(ENDPOINT, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
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
