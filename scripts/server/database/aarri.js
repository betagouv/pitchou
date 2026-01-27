/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */

import {directDatabaseConnection} from '../database.js'


/**
 * Calcule le nombre de personnes acquises sur Pitchou pour chaque semaine sur les 5 dernières semaines.
 * Une personne acquise pendant est une personne qui s'est connectée au moins une fois.
 *
 * @remarks
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 *
 * @returns { Promise<Map<string, number>> } Une correspondance entre la date de la semaine concernée et le nombre d'acquis.e à cette date
*/
async function calculerIndicateurAcquis() {
    const acquis = await directDatabaseConnection.raw(`
        with premiere_connexion as (
            select
                personne,
                min(date) as date
            from évènement_métrique
            where évènement = 'seConnecter'
            group by personne
        ),
        nombre_premiere_connexion_par_semaine as (
            select
                count(personne) as acquis_semaine,
                date_trunc('week', date)::date as semaine
            from premiere_connexion
            group by semaine
        ),
        semaines as (
            select
                date_trunc('week', semaine)::date as semaine
            from
                generate_series(now() - '5 weeks'::interval, now(), '7 days'::interval) as semaine
            union
            select semaine from nombre_premiere_connexion_par_semaine
        )
        select
            semaines.semaine as date,
            sum(acquis_semaine) over (order by semaines.semaine  asc) as acquis_total
        from
            nombre_premiere_connexion_par_semaine
        right join
            semaines
        on semaines.semaine = nombre_premiere_connexion_par_semaine.semaine
        order by date desc
        limit 5; 
    `);

    return new Map(
        ...[acquis.rows.map(
            (/** @type {any} */ row) => [row.date.toISOString(), Number(row.acquis_total)]
        )]
    )
}

/**
 * 
 * @returns  { Promise<Map<string, number>> }
 */
async function calculerIndicateurActif() {
    const actifs = await directDatabaseConnection.raw(`
        -- personnes et le nombre évènement d'action de modif par semaine
with actions_modif_par_personne as (select
	personne,
	COUNT(évènement) as nombre_actions_modif,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
WHERE évènement IN ('modifierCommentaireInstruction', 'changerPhase', 'changerProchaineActionAttendueDe', 'ajouterDécisionAdministrative', 'modifierDécisionAdministrative', 'supprimerDécisionAdministrative')
group by personne, semaine),

-- filtrer par première fois activé
premiere_fois_active as (select personne, min(semaine) as semaine
from actions_modif_par_personne
WHERE nombre_actions_modif >= :nb_seuil_actions_modif
group by personne),

-- nombre actif par semaine
nombre_active_par_semaine as (select
	count(personne) as actif_semaine,
	semaine
from premiere_fois_active
group by semaine),

-- récupérer la liste de toutes les semaines avec sûr les cinq dernières semaines
semaines as (
	select
		date_trunc('week', semaine)::date as semaine
	from
		generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
	union
	select semaine from premiere_fois_active
)

select
	semaines.semaine as date,
	sum(actif_semaine) over (order by semaines.semaine  asc) as actifs_total
from
	nombre_active_par_semaine
right join
	semaines
on semaines.semaine = nombre_active_par_semaine.semaine
order by date desc
limit :nb_semaines_observees; 
        `, {
            nb_semaines_observees: 5,
            nb_seuil_actions_modif: 5

        })

    return new Map(
        ...[actifs.rows.map(
            (/** @type {any} */ row) => [row.date.toISOString(), Number(row.actifs_total)]
        )]
    )
}

/**
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function indicateursAARRI() {
    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculerIndicateurAcquis();
    const actifs = await calculerIndicateurActif();

    const dates = acquis.keys();

    for (const date of dates) {
        indicateurs.push({
            date: date,
            nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
            nombreUtilisateuriceActif: actifs.get(date) ?? 0,
            nombreUtilisateuriceImpact: 0,
            nombreUtilisateuriceRetenu: 0,
            nombreBaseUtilisateuricePotentielle: 300,
        })
    }

    return indicateurs
}
