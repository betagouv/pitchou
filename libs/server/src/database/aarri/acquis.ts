import { directDatabaseConnection } from "../../database.ts";

export async function calculateIndicatorAcquis(
  nbSemainesObservees: number,
  observedAt: Date,
  database = directDatabaseConnection,
): Promise<Map<string, number>> {
  const acquis = await database.raw(
    `
      with premiere_connexion as (
        select personne, min(date) as date
        from evenement_metrique
        join auth_user as personne on personne.id = evenement_metrique.personne
        where evenement = 'seConnecter'
        and evenement_metrique.date <= :observed_at
        and personne.email NOT ILIKE '%@beta.gouv.fr'
        group by personne
      ), nombre_premiere_connexion_par_semaine as (
        select count(personne) as acquis_semaine, date_trunc('week', date)::date as semaine
        from premiere_connexion group by semaine
      ), semaines as (
        select date_trunc('week', semaine)::date as semaine
        from generate_series(
          :observed_at::timestamptz - (:nb_semaines_observees || ' weeks')::interval,
          :observed_at::timestamptz,
          '7 days'::interval
        ) as semaine
        union select semaine from nombre_premiere_connexion_par_semaine
      )
      select semaines.semaine as date,
        sum(acquis_semaine) over (order by semaines.semaine asc) as acquis_total
      from nombre_premiere_connexion_par_semaine
      right join semaines on semaines.semaine = nombre_premiere_connexion_par_semaine.semaine
      order by date desc limit :nb_semaines_observees;
    `,
    { nb_semaines_observees: nbSemainesObservees, observed_at: observedAt },
  );
  return new Map(acquis.rows.map((row: any) => [row.date.toISOString(), Number(row.acquis_total)]));
}
