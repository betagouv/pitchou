
import { directDatabaseConnection } from '../../database.js'
import { ÉVÈNEMENTS_MODIFICATIONS } from './constantes.js';


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
 * @returns { Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>}> } Une liste des personnes acquises et la date à laquelle elles ont été acquises.
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


/**
 * Retourne les personnes actives et la date à laquelle elles ont été considérées comme actives.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 *
 * @returns { Promise<{id: Personne['id'], email: Personne['email'], date: Date}[]>}> } Une liste des personnes actives et la date à laquelle elles ont été activées.
*/
export async function getPersonnesActives() {
    const évènements = ÉVÈNEMENTS_MODIFICATIONS
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
        nb_seuil_actions: 5,
        evenements: directDatabaseConnection.raw(évènements.map(() => '?').join(', '), évènements)
        });
    
    return requêteSQL.rows
}