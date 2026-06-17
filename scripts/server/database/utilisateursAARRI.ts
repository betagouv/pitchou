import { directDatabaseConnection } from "../database.ts";
import { computeNiveauAARRI, type LevelEvent } from "./aarri/niveau.ts";
import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from "./aarri/constantes.ts";

import type { Knex } from "knex";
import type { UtilisateurAARRI } from "../../types/API_Pitchou.ts";
import type { ÉvènementMétrique } from "../../types/évènement.d.ts";

const ACTION_TYPES = new Set<ÉvènementMétrique["type"]>([
  ...ÉVÈNEMENTS_CONSULTATIONS,
  ...ÉVÈNEMENTS_MODIFICATIONS,
]);

type PersonneEventRow = {
  personneId: number;
  email: string | null;
  nom: string | null;
  prenoms: string | null;
  type: ÉvènementMétrique["type"] | null;
  date: Date | null;
};

/**
 * Lists every Pitchou account (a personne with a code d'accès) together with
 * their current AARRI level and a few summary metrics. Personnes without a code
 * d'accès (e.g. imported contacts that never were login accounts) are excluded,
 * as are the team's own accounts (@beta.gouv.fr), to stay consistent with the
 * public stats funnel.
 *
 * One row is fetched per (personne, event) pair via a left join, then grouped
 * and reduced in memory so the level logic stays the single, well-tested
 * `computeNiveauAARRI`.
 */
export async function getUtilisateursAARRI(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<UtilisateurAARRI[]> {
  const rows: PersonneEventRow[] = await databaseConnection("personne")
    .whereNotNull("personne.code_accès")
    .whereRaw("(personne.email IS NULL OR personne.email NOT ILIKE '%@beta.gouv.fr')")
    .leftJoin("évènement_métrique", "évènement_métrique.personne", "personne.id")
    .select(
      "personne.id as personneId",
      "personne.email as email",
      "personne.nom as nom",
      "personne.prénoms as prenoms",
      "évènement_métrique.évènement as type",
      "évènement_métrique.date as date",
    );

  type Accumulator = {
    personneId: number;
    email: string | null;
    nom: string | null;
    prenoms: string | null;
    events: LevelEvent[];
    actionCount: number;
    lastActivity: Date | null;
  };

  const parPersonne = new Map<number, Accumulator>();

  for (const row of rows) {
    let acc = parPersonne.get(row.personneId);
    if (!acc) {
      acc = {
        personneId: row.personneId,
        email: row.email,
        nom: row.nom,
        prenoms: row.prenoms,
        events: [],
        actionCount: 0,
        lastActivity: null,
      };
      parPersonne.set(row.personneId, acc);
    }

    // A personne with no event still produces a single row (null join columns).
    if (row.type === null || row.date === null) continue;

    const date = row.date instanceof Date ? row.date : new Date(row.date);
    acc.events.push({ type: row.type, date });

    if (ACTION_TYPES.has(row.type)) acc.actionCount += 1;
    if (!acc.lastActivity || date > acc.lastActivity) acc.lastActivity = date;
  }

  return [...parPersonne.values()].map((acc) => ({
    personneId: acc.personneId,
    email: acc.email,
    nom: acc.nom,
    prenoms: acc.prenoms,
    niveau: computeNiveauAARRI(acc.events),
    actionCount: acc.actionCount,
    lastActivityDate: acc.lastActivity ? acc.lastActivity.toISOString() : null,
  }));
}
