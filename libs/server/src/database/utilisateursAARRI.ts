import { directDatabaseConnection } from "../database.ts";
import { computeNiveauAARRI, type LevelEvent } from "./aarri/niveau.ts";
import { EVENEMENTS_CONSULTATIONS, EVENEMENTS_MODIFICATIONS } from "./aarri/constants.ts";

import type { Knex } from "knex";
import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";

const ACTION_TYPES = new Set<EvenementMetrique["type"]>([
  ...EVENEMENTS_CONSULTATIONS,
  ...EVENEMENTS_MODIFICATIONS,
]);

type PersonneEventRow = {
  personneId: number;
  email: string | null;
  lastName: string | null;
  firstNames: string | null;
  groupesInstructeurs: string[] | null;
  type: EvenementMetrique["type"] | null;
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
  const groupesParPersonne = databaseConnection("cap_dossier")
    .join(
      "edge_cap_dossier__groupe_instructeurs",
      "edge_cap_dossier__groupe_instructeurs.cap_dossier",
      "cap_dossier.cap",
    )
    .join(
      "groupe_instructeurs",
      "groupe_instructeurs.id",
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    )
    .select("cap_dossier.personne_cap")
    .select(
      databaseConnection.raw(
        "array_agg(DISTINCT groupe_instructeurs.name ORDER BY groupe_instructeurs.name) as groupes",
      ),
    )
    .groupBy("cap_dossier.personne_cap")
    .as("groupes_par_personne");

  const rows: PersonneEventRow[] = await databaseConnection("personne")
    .whereNotNull("personne.access_code")
    .whereRaw("(personne.email IS NULL OR personne.email NOT ILIKE '%@beta.gouv.fr')")
    .leftJoin("evenement_metrique", "evenement_metrique.personne", "personne.id")
    .leftJoin(groupesParPersonne, "groupes_par_personne.personne_cap", "personne.access_code")
    .select(
      "personne.id as personneId",
      "personne.email as email",
      "personne.last_name as lastName",
      "personne.first_names as firstNames",
      "groupes_par_personne.groupes as groupesInstructeurs",
      "evenement_metrique.evenement as type",
      "evenement_metrique.date as date",
    );

  type Accumulator = {
    personneId: number;
    email: string | null;
    lastName: string | null;
    firstNames: string | null;
    groupesInstructeurs: string[];
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
        lastName: row.lastName,
        firstNames: row.firstNames,
        groupesInstructeurs: row.groupesInstructeurs ?? [],
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
    lastName: acc.lastName,
    firstNames: acc.firstNames,
    niveau: computeNiveauAARRI(acc.events),
    groupesInstructeurs: acc.groupesInstructeurs,
    actionCount: acc.actionCount,
    lastActivityDate: acc.lastActivity ? acc.lastActivity.toISOString() : null,
  }));
}
