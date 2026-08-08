import { directDatabaseConnection } from "../../database.ts";
import { EVENEMENTS_MODIFICATIONS } from "./constants.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";

async function nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(
  nombreSemainesObservees: number,
  evenements: EvenementMetrique["type"][],
  seuilNombreEvenements: number,
): Promise<Map<string, number>> {
  const result = await directDatabaseConnection.raw(
    `
      with actions_par_personne as (
        select personne, COUNT(evenement) as nombre_actions,
          date_trunc('week', e.date)::date as semaine
        from evenement_metrique as e
        join personne on personne.id = e.personne
        where evenement IN (:evenements)
        and personne.email NOT ILIKE '%@beta.gouv.fr'
        group by personne, semaine
      ), premiere_fois_seuil_atteint as (
        select personne, min(semaine) as semaine from actions_par_personne
        where nombre_actions >= :nb_seuil_actions group by personne
      ), nombre_personnes_par_semaine as (
        select count(personne) as nombre_personne_pour_cette_semaine, semaine
        from premiere_fois_seuil_atteint group by semaine
      ), semaines as (
        select date_trunc('week', semaine)::date as semaine
        from generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
        union select semaine from premiere_fois_seuil_atteint
      )
      select semaines.semaine as date,
        sum(nombre_personne_pour_cette_semaine) over (order by semaines.semaine asc) as quantite_personnes
      from nombre_personnes_par_semaine
      right join semaines on semaines.semaine = nombre_personnes_par_semaine.semaine
      order by date desc limit :nb_semaines_observees;
    `,
    {
      nb_semaines_observees: nombreSemainesObservees,
      nb_seuil_actions: seuilNombreEvenements,
      evenements: directDatabaseConnection.raw(evenements.map(() => "?").join(", "), evenements),
    },
  );
  return new Map(
    result.rows.map((row: any) => [row.date.toISOString(), Number(row.quantite_personnes)]),
  );
}

export function calculateIndicatorActif(nbSemainesObservees: number): Promise<Map<string, number>> {
  return nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(
    nbSemainesObservees,
    EVENEMENTS_MODIFICATIONS,
    5,
  );
}

export function calculateIndicatorImpact(
  nbSemainesObservees: number,
): Promise<Map<string, number>> {
  return nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(
    nbSemainesObservees,
    ["retourÀLaConformité"],
    1,
  );
}
