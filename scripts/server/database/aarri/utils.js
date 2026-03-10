
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
 * Renvoie la liste des personnes ayant enregistré un nombre d'évènements au-delà d'un certain seuil pour la première fois
 * ainsi que la semaine à laquelle elles ont enregistré ce nombre d'évènements pour la première fois
 * 
 * @param {ÉvènementMétrique['type'][]} évènements
 * @param {number} nombreSeuil
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], semaine: Date}[]>}
*/
export async function getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil) {
    const requêteSQL = await directDatabaseConnection.raw(
        `-- personnes et le nombre évènement suivis par semaine
with evenements_par_personne as (select
	personne,
	COUNT(évènement) as nombre_evenements,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine),

-- filtrer par semaine où le seuil est atteint et garder la semaine la plus ancienne
seuil_atteint as (select personne, MIN(semaine) as semaine
from evenements_par_personne
WHERE nombre_evenements >= :nb_seuil_evenements
group by personne
)

select personne.id, personne.email, semaine
from seuil_atteint
join personne on seuil_atteint.personne = personne.id`
        , {
            nb_seuil_evenements: nombreSeuil,
            evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
        });
    const personnesEtDates = requêteSQL.rows
    return personnesEtDates
        
}