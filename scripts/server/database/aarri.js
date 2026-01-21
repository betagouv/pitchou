/** @import { IndicateursAARRI } from '../../types/API_Pitchou.js'; */

import {directDatabaseConnection} from '../database.js'


/**
 *
 * @returns { Promise<Map<string, number>> }
 */
async function calculéIndicateurAcquis() {
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
            (/** @type {any} */ row) => [row.date, Number(row.acquis_total)]
        )]
    )
}

/**
 * @returns {Promise<IndicateursAARRI[]>}
 */
export async function indicateursAARRI() {
    /** @type {IndicateursAARRI[]} */
    const indicateurs = [];
    const acquis = await calculéIndicateurAcquis();
    console.log(acquis)

    const dates = acquis.keys();

    for (const date of dates) {
        indicateurs.push({
            date: date,
            nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
            nombreUtilisateuriceActif: 0,
            nombreUtilisateuriceImpact: 0,
            nombreUtilisateuriceRetenu: 0,
            nombreBaseUtilisateuricePotentielle: 300,
        })
    }

    return indicateurs
}
