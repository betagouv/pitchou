
import {json, dsv} from 'd3-fetch'


/**
 * 
 * @param {string} email 
 */
export function envoiEmailConnexion(email){
    return json(`/envoi-email-connexion?email=${encodeURIComponent(email)}`, {
        method: 'POST'
    })
}