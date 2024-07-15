//@ts-check

import ky from 'ky';

const BREVO_API_KEY = process.env.BREVO_API_KEY

// keep in sync with https://app.brevo.com/templates/listing
const CONNEXION_EMAIL_TEMPLATE_ID = 1

if(!BREVO_API_KEY){
    console.error('Missing BREVO_API_KEY environment variable')
    process.exit(1);
}

const BREVO_EMAIL_SEND_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';


/** 
 * 
 * @param {string} email 
 * @param {string} lienConnexion 
 * @returns {Promise<any>}
 */
export async function envoyerEmailConnexion(email, lienConnexion){
    
    return ky.post(BREVO_EMAIL_SEND_ENDPOINT, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': BREVO_API_KEY
        },
        json: {
            templateId: CONNEXION_EMAIL_TEMPLATE_ID,
            to: [
                {email}
            ],
            params: {
                'lien_connexion': lienConnexion
            }
        }
    })
    .json()
}