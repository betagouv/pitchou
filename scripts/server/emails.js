/**
 * Pour le moment, cette fonction est complètement fake, mais à terme,
 * elle enverra un email
 * 
 * @param {string} email 
 * @param {string} lienConnexion 
 * @returns {Promise<any>}
 */
export function envoyerEmailConnexion(email, lienConnexion){
    
    return Promise.resolve({
        email,
        lienConnexion
    })
}