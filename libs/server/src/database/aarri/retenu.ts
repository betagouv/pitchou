import { eachWeekOfInterval } from "date-fns";
import { directDatabaseConnection } from "../../database.ts";
import { EVENEMENTS_CONSULTATIONS, EVENEMENTS_MODIFICATIONS } from "./constants.ts";
import { getFirstRetenuWeek } from "./niveau.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

type Semaine = string;

export async function calculateIndicatorRetenu(start: Date): Promise<Map<Semaine, number>> {
  const evenements = [...EVENEMENTS_CONSULTATIONS, ...EVENEMENTS_MODIFICATIONS];
  const semaines = eachWeekOfInterval({ start, end: new Date() }, { weekStartsOn: 1 }).map(
    (semaine) => semaine.toISOString(),
  );
  const result: { rows: { personne: string; nombre_actions: string; semaine: Date }[] } =
    await directDatabaseConnection.raw(
      `
        select personne, COUNT(evenement) as nombre_actions,
          date_trunc('week', e.date)::date as semaine
        from evenement_metrique as e
        join personne on personne.id = e.personne
        where evenement IN (:evenements)
        and personne.email NOT ILIKE '%@beta.gouv.fr'
        group by personne, semaine;
      `,
      {
        evenements: directDatabaseConnection.raw(evenements.map(() => "?").join(", "), evenements),
      },
    );
  const actionsParPersonne = new Map<PersonneId, Map<Semaine, number>>();
  for (const row of result.rows) {
    const personne = Number(row.personne) as PersonneId;
    const actions = actionsParPersonne.get(personne) || new Map();
    actions.set(row.semaine.toISOString(), Number(row.nombre_actions));
    actionsParPersonne.set(personne, actions);
  }
  const premiereSemaineParPersonne = new Map<PersonneId, Semaine>();
  actionsParPersonne.forEach((actions, personne) => {
    const semaine = getFirstRetenuWeek(actions, 5, 8, semaines, 5);
    if (semaine) premiereSemaineParPersonne.set(personne, semaine);
  });
  const nouveauxRetenus = Map.groupBy([...premiereSemaineParPersonne], ([, semaine]) => semaine);
  const retenusCumules = new Map<Semaine, number>();
  let total = 0;
  for (const semaine of semaines) {
    total += nouveauxRetenus.get(semaine)?.length ?? 0;
    retenusCumules.set(semaine, total);
  }
  return retenusCumules;
}
