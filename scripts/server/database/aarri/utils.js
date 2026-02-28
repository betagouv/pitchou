
/** @import Évènement from '../../../types/database/public/ÉvènementMétrique' */
/** @import Personne from '../../../types/database/public/Personne' */
/** @import { ÉvènementMétrique } from '../../../types/évènement.js' */

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

/**
 * Renvoie la liste des personnes qui ont enregistré un nombre d'actions au-delà d'un certain seuil
 * ainsi que la date à laquelle elles ont enregistré ce nombre d'actions
 * 
 * @param {ÉvènementMétrique['type'][]} évènements
 * @param {number} nombreSeuil
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>} Une liste des personnes actives et la date à laquelle elles ont été activées.
*/
export async function getPersonnesAyantAtteintSeuilÉvènementsParDate(évènements, nombreSeuil) {
    const requêteSQL = await directDatabaseConnection.raw(
        `-- personnes et le nombre évènement suivis par semaine
with actions_par_personne as (select
	personne,
	COUNT(évènement) as nombre_actions,
	date_trunc('week', e.date)::date as date
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, date),

-- filtrer par première fois où le seuil est atteint
premiere_fois_seuil_atteint as (select personne, min(date) as date
from actions_par_personne
WHERE nombre_actions >= :nb_seuil_actions
group by personne)

select personne.id, personne.email, date
from premiere_fois_seuil_atteint
join personne on premiere_fois_seuil_atteint.personne = personne.id`
        , {
            nb_seuil_actions: nombreSeuil,
            evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
        });

        return requêteSQL.rows
        
}