
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
 * Renvoie la liste des fois où une personne a enregistré un nombre d'actions au-delà d'un certain seuil
 * ainsi que la date à laquelle elles ont enregistré ce nombre d'actions
 * 
 * @param {ÉvènementMétrique['type'][]} évènements
 * @param {number} nombreSeuil
 * @returns {Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>}
*/
export async function getPremièreDateAtteinteDuSeuilParPersonne(évènements, nombreSeuil) {
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

-- filtrer par semaine où le seuil est atteint
seuil_atteint as (select personne, date
from actions_par_personne
WHERE nombre_actions >= :nb_seuil_actions
)

select personne.id, personne.email, date
from seuil_atteint
join personne on seuil_atteint.personne = personne.id`
        , {
            nb_seuil_actions: nombreSeuil,
            evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
        });

    /** @type {{id: Personne['id'], email: Personne['email'], date: Date}[]} */
    const personnesEtDates = requêteSQL.rows

    /** @type {{id: Personne['id'], email: Personne['email'], date: Date}[]} */
    const résultat = Array.from(
    personnesEtDates.reduce((map, actuelle) => {
        const existante = map.get(actuelle.id);

        // Si pas encore d'id ou si la date est plus ancienne
        if (!existante || actuelle.date < existante.date) {
        map.set(actuelle.id, actuelle);
        }

        return map;
    }, new Map()).values()
    );

    return résultat
        
}