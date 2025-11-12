import ky from 'ky';
import pLimit from 'p-limit';

const TIMEOUT_DELAY = 20*1000; // ms

/**
 * 
 * @param {string} url 
 * @returns {Promise<{mediaType: string | null, contenu: ArrayBuffer}>}
 */
async function _téléchargerFichierDS(url){
    try{
        const réponseSansBody = await ky.get(url, {
            timeout: TIMEOUT_DELAY
        })
        
        const mediaType = réponseSansBody?.headers?.get('Content-Type')

        const réponse = await réponseSansBody.arrayBuffer()
    
        return {
            mediaType,
            contenu: réponse
        }
    }
    catch(err){
        // @ts-ignore
        if(err.name === 'TimeoutError'){
            const message = `\nTimeout d'une requête HTTP vers DS après ${TIMEOUT_DELAY/1000} secondes\n\n`
            const erreurSimple = new Error(message)
            console.error(message)
            throw erreurSimple
        }

        throw err
    }
}


/**
 * Afin de ne pas surcharger DS, nous limitons le nombre de téléchargements simultannés
 * Un petit nombre est plus accomodant pour DS, 
 * mais réduit notre performance
 * Un gros nombre augmente notre parallélisme et sûrement notre performance (jusqu'à une limite), 
 * mais surcharge + DS
 * 
 */
const NOMBRE_MAX_TÉLÉCHARGEMENTS_SIMULTANNÉES = 6
const fenêtre = pLimit(NOMBRE_MAX_TÉLÉCHARGEMENTS_SIMULTANNÉES)

/**
 * 
 * @param {string} url 
 * @returns {Promise<{mediaType: string | null, contenu: ArrayBuffer}>}
 */
export default async function téléchargerFichierDS(url){
    return fenêtre(() => _téléchargerFichierDS(url))
}