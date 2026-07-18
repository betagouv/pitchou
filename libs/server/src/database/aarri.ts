import { eachWeekOfInterval, differenceInCalendarWeeks } from "date-fns";
import { directDatabaseConnection } from "../database.ts";
import { EVENEMENTS_CONSULTATIONS, EVENEMENTS_MODIFICATIONS } from "./aarri/constants.ts";
import { getFirstRetenuWeek } from "./aarri/niveau.ts";

import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

/**
 * Corresponds to the day of a week
 */
type Semaine = string;

/**
 * Computes the number of acquired persons on Pitchou for each week over the last 5 weeks.
 * An acquired person is a person who has connected at least once.
 *
 * For now, we consider that connecting corresponds to the action "clicked on a connection link".
 * Out of respect for the GDPR, this event will be lost one year after being recorded.
 * If this is a problem, we could record the event in another way so as not to lose the information.
 */
async function calculateIndicatorAcquis(
  nbSemainesObservees: number,
): Promise<Map<Semaine, number>> {
  const acquis = await directDatabaseConnection.raw(
    `
        with premiere_connexion as (
            select
                personne,
                min(date) as date
            from évènement_métrique
            join personne on personne.id = évènement_métrique.personne
            where évènement = 'seConnecter'
            and personne.email NOT ILIKE '%@beta.gouv.fr'
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
                generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
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
        limit :nb_semaines_observees; 
    `,
    {
      nb_semaines_observees: nbSemainesObservees,
    },
  );

  return new Map(
    ...[acquis.rows.map((row: any) => [row.date.toISOString(), Number(row.acquis_total)])],
  );
}

/**
 * A mapping between the date of the concerned week and the cumulative number of persons having
 * reached the threshold at that date.
 */
async function nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(
  nombreSemainesObservees: number,
  evenements: EvenementMetrique["type"][],
  seuilNombreEvenements: number,
): Promise<Map<string, number>> {
  const requeteSQL = `
-- personnes et le nombre évènement suivis par semaine
with actions_par_personne as (select
	personne,
	COUNT(évènement) as nombre_actions,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine),

-- filtrer par première fois où le seuil est atteint
premiere_fois_seuil_atteint as (select personne, min(semaine) as semaine
from actions_par_personne
WHERE nombre_actions >= :nb_seuil_actions
group by personne),

-- nombre actif par semaine
nombre_personnes_par_semaine as (select
	count(personne) as nombre_personne_pour_cette_semaine,
	semaine
from premiere_fois_seuil_atteint
group by semaine),

-- récupérer la liste de toutes les semaines avec sûr les nb_semaines_observees dernières semaines
semaines as (
	select
		date_trunc('week', semaine)::date as semaine
	from
		generate_series(now() - (:nb_semaines_observees || ' weeks')::interval, now(), '7 days'::interval) as semaine
	union
	select semaine from premiere_fois_seuil_atteint
)

select
	semaines.semaine as date,
	sum(nombre_personne_pour_cette_semaine) over (order by semaines.semaine  asc) as quantite_personnes
from
	nombre_personnes_par_semaine
right join
	semaines
on semaines.semaine = nombre_personnes_par_semaine.semaine
order by date desc
limit :nb_semaines_observees; 
        `;

  const personnesParSemaines = await directDatabaseConnection.raw(requeteSQL, {
    nb_semaines_observees: nombreSemainesObservees,
    nb_seuil_actions: seuilNombreEvenements,
    evenements: directDatabaseConnection.raw(evenements.map(() => "?").join(", "), evenements),
  });

  return new Map(
    ...[
      personnesParSemaines.rows.map((row: any) => [
        row.date.toISOString(),
        Number(row.quantite_personnes),
      ]),
    ],
  );
}

/**
 * Computes the number of active persons on Pitchou for each week over the last X weeks.
 * An active person is a person who has performed at least 5 modification actions in a week.
 */
async function calculateIndicatorActif(nbSemainesObservees: number): Promise<Map<string, number>> {
  return nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(
    nbSemainesObservees,
    EVENEMENTS_MODIFICATIONS,
    5,
  );
}

/**
 * Computes the number of persons who created an impact on Pitchou for each week
 * Pitchou's impact is measured by the returns to conformity
 *
 * A mapping between the date of the concerned week and the number of persons
 * having an "impact" at that date
 */
async function calculateIndicatorImpact(nbSemainesObservees: number): Promise<Map<string, number>> {
  /*
        Having an impact means performing at least one control that produces a return to conformity
        so a Conforme control that comes after a control that is something other than Conforme
    */

  const evenements: EvenementMetrique["type"][] = ["retourÀLaConformité"];

  return nombrePersonnesAyantAtteintSeuilDEvenmentsParSemaine(nbSemainesObservees, evenements, 1);
}

/**
 * Computes the number of retained persons on Pitchou for each week since the beginning (though we recall that the storage duration of this data is one year).
 * A retained person is a person who repeats 5 consultation or modification actions in a week over at least 5 of the last 8 weeks.
 *
 * We decide to look at the number of validated weeks over an 8-week period to account for the leave of the instructrices (utilisateurices).
 */
async function calculateIndicatorRetenu(start: Date): Promise<Map<Semaine, number>> {
  // Parameters of the retention condition
  const evenements = [...EVENEMENTS_CONSULTATIONS, ...EVENEMENTS_MODIFICATIONS];
  const nombreSemainesGlissantesAObserver = 8;
  const nombreSeuilActionsParSemaine = 5;
  const nombreSeuilSemainesValidees = 5;

  const semaines: Semaine[] = eachWeekOfInterval(
    {
      start,
      end: new Date(),
    },
    {
      weekStartsOn: 1,
    },
  ).map((semaine) => semaine.toISOString());

  const retourRequete: { rows: { personne: string; nombre_actions: string; semaine: Semaine }[] } =
    await directDatabaseConnection.raw(
      `
        -- personnes et le nombre évènement d'action de modif/consult par semaine
select
	personne,
	COUNT(évènement) as nombre_actions,
	date_trunc('week', e.date)::date as semaine
from évènement_métrique as e
join personne on personne.id = e.personne
WHERE évènement IN (:evenements)
and personne.email NOT ILIKE '%@beta.gouv.fr'
group by personne, semaine;
        `,
      {
        evenements: directDatabaseConnection.raw(evenements.map(() => "?").join(", "), evenements),
      },
    );

  // @ts-ignore
  const retourRequeteFormattee: {
    personne: PersonneId;
    nombre_actions: number;
    semaine: Semaine;
  }[] = retourRequete.rows.map((row) => ({
    personne: Number(row.personne),
    nombre_actions: Number(row.nombre_actions),
    // @ts-ignore
    semaine: row.semaine.toISOString(),
  }));

  const resultatsParPersonne: Map<PersonneId, Map<Semaine, number>> = new Map();

  for (const { personne, nombre_actions, semaine } of retourRequeteFormattee) {
    const nombreActionsParSemaine: Map<Semaine, number> =
      resultatsParPersonne.get(personne) || new Map();
    nombreActionsParSemaine.set(semaine, nombre_actions);
    resultatsParPersonne.set(personne, nombreActionsParSemaine);
  }

  // For each person, identify the first week when they were retained.
  const premiereSemaineRetenuParPersonne: Map<PersonneId, Semaine> = new Map();

  resultatsParPersonne.forEach((nombreActionsParSemaine, personne) => {
    const semaineRetenue = getFirstRetenuWeek(
      nombreActionsParSemaine,
      nombreSeuilActionsParSemaine,
      nombreSemainesGlissantesAObserver,
      semaines,
      nombreSeuilSemainesValidees,
    );

    if (semaineRetenue) {
      premiereSemaineRetenuParPersonne.set(personne, semaineRetenue);
    }
  });

  //Compute the number of retained persons per week
  const nombreRetenusParSemaine: Map<Semaine, number> = new Map();

  const personnesPremiereFoisRetenueRegroupeesParSemaine: Map<Semaine, [PersonneId, Semaine][]> =
    Map.groupBy([...premiereSemaineRetenuParPersonne], ([_, semaine]) => semaine);

  personnesPremiereFoisRetenueRegroupeesParSemaine.forEach((value, cetteSemaine) => {
    const nombrePersonnesRetenuesCetteSemaine = value.length;
    nombreRetenusParSemaine.set(cetteSemaine, nombrePersonnesRetenuesCetteSemaine);
  });

  //Then, we compute the cumulative number of retained persons per week
  const nombreRetenusCumulesParSemaine: Map<Semaine, number> = new Map();

  let nombreRetenusCumules = 0;
  for (const semaineObservee of semaines) {
    nombreRetenusCumules =
      nombreRetenusCumules + (nombreRetenusParSemaine.get(semaineObservee) ?? 0);
    nombreRetenusCumulesParSemaine.set(semaineObservee, nombreRetenusCumules);
  }

  return nombreRetenusCumulesParSemaine;
}

/**
 * Returns the Monday of the week of the very first metric event,
 * or undefined when there is no metric event yet.
 */
async function firstEventWeek(): Promise<Date | undefined> {
  const result = await directDatabaseConnection.raw(
    `select date_trunc('week', min(date))::date as week from évènement_métrique`,
  );
  return result.rows[0]?.week ?? undefined;
}

export async function indicatorsAARRI(): Promise<IndicatorsAARRI[]> {
  const premiereSemaine = await firstEventWeek();

  // Observe every week since the first event (with a small margin so the
  // oldest one is not truncated). Defaults to 5 weeks when there is no event.
  const nbSemainesObservees = premiereSemaine
    ? differenceInCalendarWeeks(new Date(), premiereSemaine, { weekStartsOn: 1 }) + 2
    : 5;

  const indicators: IndicatorsAARRI[] = [];
  const acquis = await calculateIndicatorAcquis(nbSemainesObservees);
  const actifs = await calculateIndicatorActif(nbSemainesObservees);
  const retenus = await calculateIndicatorRetenu(premiereSemaine ?? new Date());
  const impacts = await calculateIndicatorImpact(nbSemainesObservees);

  const dates = acquis.keys();

  for (const date of dates) {
    indicators.push({
      date: date,
      nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
      nombreUtilisateuriceActif: actifs.get(date) ?? 0,
      nombreUtilisateuriceRetenu: retenus.get(date) ?? 0,
      nombreUtilisateuriceImpact: impacts.get(date) ?? 0,
      nombreBaseUtilisateuricePotentielle: 300,
    });
  }

  return indicators;
}
