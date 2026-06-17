import { eachWeekOfInterval, differenceInCalendarWeeks } from "date-fns";
import { directDatabaseConnection } from "../database.ts";
import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from "./aarri/constantes.ts";
import { getFirstRetenuWeek } from "./aarri/niveau.ts";

import type { IndicateursAARRI } from "../../types/API_Pitchou.ts";
import type { ÉvènementMétrique } from "../../types/évènement.d.ts";
import type { PersonneId } from "../../types/database/public/Personne.ts";

/**
 * Correspond au jour d'une semaine
 */
type Semaine = string;

/**
 * Calcule le nombre de personnes acquises sur Pitchou pour chaque semaine sur les 5 dernières semaines.
 * Une personne acquise est une personne qui s'est connectée au moins une fois.
 *
 * Pour l'instant, on considère que se connecter correspond à l'action "a cliqué sur un lien de connexion".
 * Par respect du RGPD, cet évènement sera perdu un an après son enregistrement.
 * Si c'est un problème, nous pourrons enregistrer l'évènement d'une autre manière pour ne pas perdre l'information.
 */
async function calculerIndicateurAcquis(
  nbSemainesObservées: number,
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
      nb_semaines_observees: nbSemainesObservées,
    },
  );

  return new Map(
    ...[acquis.rows.map((row: any) => [row.date.toISOString(), Number(row.acquis_total)])],
  );
}

/**
 * Une correspondance entre la date de la semaine concernée et le nombre de personnes cumulées ayant
 * atteint le seuil à cette date.
 */
async function nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(
  nombreSemainesObservées: number,
  évènements: ÉvènementMétrique["type"][],
  seuilNombreÉvènements: number,
): Promise<Map<string, number>> {
  const requêteSQL = `
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

  const personnesParSemaines = await directDatabaseConnection.raw(requêteSQL, {
    nb_semaines_observees: nombreSemainesObservées,
    nb_seuil_actions: seuilNombreÉvènements,
    evenements: directDatabaseConnection.raw(évènements.map(() => "?").join(", "), évènements),
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
 * Calcule le nombre de personnes actives sur Pitchou pour chaque semaine sur les X dernières semaines.
 * Une personne active est une personne qui a effectué au moins 5 actions de modifications sur une semaine.
 */
async function calculerIndicateurActif(nbSemainesObservées: number): Promise<Map<string, number>> {
  return nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(
    nbSemainesObservées,
    ÉVÈNEMENTS_MODIFICATIONS,
    5,
  );
}

/**
 * Calcule le nombre de personnes qui ont créé un impact sur Pitchou pour chaque semaine
 * L'impact de Pitchou est mesuré par les retours à conformité
 *
 * Une correspondance entre la date de la semaine concernée et le nombre de personne
 * ayant un "impact" à cette date
 */
async function calculerIndicateurImpact(nbSemainesObservées: number): Promise<Map<string, number>> {
  /*
        Avoir de l'impact, c'est de faire au moins un contrôle qui produit un retour à la conformité
        donc un contrôle Conforme qui arrive après un contrôle qui est autre chose que Conforme
    */

  const évènements: ÉvènementMétrique["type"][] = ["retourÀLaConformité"];

  return nombrePersonnesAyantAtteintSeuilDÉvènmentsParSemaine(nbSemainesObservées, évènements, 1);
}

/**
 * Calcule le nombre de personnes retenues sur Pitchou pour chaque semaine depuis toujours (bien qu'on rappelle que la durée de stockage de ces données est d'un an).
 * Une personne retenue est une personne qui renouvelle 5 actions consultation ou modification sur une semaine sur au moins 5 des 8 dernières semaines.
 *
 * On décide de regarder le nombre de semaines validées sur une période de 8 semaines pour tenir compte des congés des instructrices (utilisateurices).
 */
async function calculerIndicateurRetenu(start: Date): Promise<Map<Semaine, number>> {
  // Paramètres de la condition de rétention
  const évènements = [...ÉVÈNEMENTS_CONSULTATIONS, ...ÉVÈNEMENTS_MODIFICATIONS];
  const nombreSemainesGlissantesÀObserver = 8;
  const nombreSeuilActionsParSemaine = 5;
  const nombreSeuilSemainesValidées = 5;

  const semaines: Semaine[] = eachWeekOfInterval(
    {
      start,
      end: new Date(),
    },
    {
      weekStartsOn: 1,
    },
  ).map((semaine) => semaine.toISOString());

  const retourRequête: { rows: { personne: string; nombre_actions: string; semaine: Semaine }[] } =
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
        evenements: directDatabaseConnection.raw(évènements.map(() => "?").join(", "), évènements),
      },
    );

  // @ts-ignore
  const retourRequêteFormattée: {
    personne: PersonneId;
    nombre_actions: number;
    semaine: Semaine;
  }[] = retourRequête.rows.map((row) => ({
    personne: Number(row.personne),
    nombre_actions: Number(row.nombre_actions),
    // @ts-ignore
    semaine: row.semaine.toISOString(),
  }));

  const résultatsParPersonne: Map<PersonneId, Map<Semaine, number>> = new Map();

  for (const { personne, nombre_actions, semaine } of retourRequêteFormattée) {
    const nombreActionsParSemaine: Map<Semaine, number> =
      résultatsParPersonne.get(personne) || new Map();
    nombreActionsParSemaine.set(semaine, nombre_actions);
    résultatsParPersonne.set(personne, nombreActionsParSemaine);
  }

  // Pour chaque personne, identifier la première semaine où elle a été retenue.
  const premièreSemaineRetenuParPersonne: Map<PersonneId, Semaine> = new Map();

  résultatsParPersonne.forEach((nombreActionsParSemaine, personne) => {
    const semaineRetenue = getFirstRetenuWeek(
      nombreActionsParSemaine,
      nombreSeuilActionsParSemaine,
      nombreSemainesGlissantesÀObserver,
      semaines,
      nombreSeuilSemainesValidées,
    );

    if (semaineRetenue) {
      premièreSemaineRetenuParPersonne.set(personne, semaineRetenue);
    }
  });

  //Calculer le nombre de personnes retenues par semaine
  const nombreRetenusParSemaine: Map<Semaine, number> = new Map();

  const personnesPremièreFoisRetenueRegroupéesParSemaine: Map<Semaine, [PersonneId, Semaine][]> =
    Map.groupBy([...premièreSemaineRetenuParPersonne], ([_, semaine]) => semaine);

  personnesPremièreFoisRetenueRegroupéesParSemaine.forEach((value, cetteSemaine) => {
    const nombrePersonnesRetenuesCetteSemaine = value.length;
    nombreRetenusParSemaine.set(cetteSemaine, nombrePersonnesRetenuesCetteSemaine);
  });

  //Puis, on fait le cumul de nombre de retenu.e.s par semaine
  const nombreRetenusCumulésParSemaine: Map<Semaine, number> = new Map();

  let nombreRetenusCumulés = 0;
  for (const semaineObservée of semaines) {
    nombreRetenusCumulés =
      nombreRetenusCumulés + (nombreRetenusParSemaine.get(semaineObservée) ?? 0);
    nombreRetenusCumulésParSemaine.set(semaineObservée, nombreRetenusCumulés);
  }

  return nombreRetenusCumulésParSemaine;
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

export async function indicateursAARRI(): Promise<IndicateursAARRI[]> {
  const premièreSemaine = await firstEventWeek();

  // Observe every week since the first event (with a small margin so the
  // oldest one is not truncated). Defaults to 5 weeks when there is no event.
  const nbSemainesObservées = premièreSemaine
    ? differenceInCalendarWeeks(new Date(), premièreSemaine, { weekStartsOn: 1 }) + 2
    : 5;

  const indicateurs: IndicateursAARRI[] = [];
  const acquis = await calculerIndicateurAcquis(nbSemainesObservées);
  const actifs = await calculerIndicateurActif(nbSemainesObservées);
  const retenus = await calculerIndicateurRetenu(premièreSemaine ?? new Date());
  const impacts = await calculerIndicateurImpact(nbSemainesObservées);

  const dates = acquis.keys();

  for (const date of dates) {
    indicateurs.push({
      date: date,
      nombreUtilisateuriceAcquis: acquis.get(date) ?? 0,
      nombreUtilisateuriceActif: actifs.get(date) ?? 0,
      nombreUtilisateuriceRetenu: retenus.get(date) ?? 0,
      nombreUtilisateuriceImpact: impacts.get(date) ?? 0,
      nombreBaseUtilisateuricePotentielle: 300,
    });
  }

  return indicateurs;
}
