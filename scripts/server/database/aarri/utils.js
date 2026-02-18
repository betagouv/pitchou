
/** @import Évènement from '../../../types/database/public/ÉvènementMétrique' */
/** @import Personne from '../../../types/database/public/Personne' */

import { directDatabaseConnection } from '../../database.js'

/**
 * @param {Personne['email']} email
 * @returns {Promise<Évènement[]>} 
 */
export async function getÉvènementsForPersonne(email) {
    const requêteSQL = await directDatabaseConnection('personne')
        .select('id')
        .where('email', '=', email)

    if (!(requêteSQL && Array.isArray(requêteSQL) && requêteSQL.length >=1 && requêteSQL[0].id)) {
        throw new Error(`Aucun id n'a été trouvé pour l'email ${email}.`)
    }

    const personneId = requêteSQL[0].id
    
    const évènements = await directDatabaseConnection('évènement_métrique')
        .select('*')
        .where('personne', '=', personneId)
        .orderBy('date','desc')

    return évènements
}