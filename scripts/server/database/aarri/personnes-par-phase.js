/** @import Personne from '../../../types/database/public/Personne' */
import { directDatabaseConnection } from '../../database.js'


/**
 * Correspond au jour d'une semaine
 * @typedef {string} Semaine
 */


/**
 * Retourne les personnes acquises et la date à laquelle elles ont été considérées comme acquises.
 * Une personne acquise est une personne qui s'est connectée au moins une fois.
 *
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns { Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>}> } Une liste entre la personne et le moment où elle a été acquise.
*/
export async function getPersonnesAcquises() {
    const requêteSQL = await directDatabaseConnection.raw(
        `with premiere_connexion as (
            select
                personne,
                min(date) as date
            from évènement_métrique
            join personne on personne.id = évènement_métrique.personne
            where évènement = 'seConnecter'
            and personne.email NOT ILIKE '%@beta.gouv.fr'
            group by personne
        )
select personne.id, personne.email, date
from premiere_connexion
join personne on premiere_connexion.personne = personne.id`
        );
    
    return requêteSQL.rows
}
