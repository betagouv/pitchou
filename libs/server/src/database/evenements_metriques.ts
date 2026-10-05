import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addDossierSearch } from "./dossier_search.ts";

import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

export async function addEvenementForUser(cap: number, event: EvenementMetrique) {
  const personne = await directDatabaseConnection("auth_user")
    .where({ id: cap, active: true })
    .first();
  if (!personne) throw new Error("Utilisateur introuvable");

  await directDatabaseConnection("evenement_metrique").insert({
    evenement: event.type,
    details: "details" in event ? event.details : null,
    personne: personne.id,
  });

  // Text searches also feed the recent-searches suggestions of the search bar
  if (event.type === "rechercherDesDossiers") {
    const text = event.details.filters.text?.trim();
    if (text) {
      await addDossierSearch(personne.id, text);
    }
  }
}

export async function deleteEvenementsByEmail(
  email: NonNullable<Personne["email"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("evenement_metrique")
    .join("auth_user as personne", { "personne.id": "evenement_metrique.personne" })
    .where({ email: email })
    .delete();
}

export async function getAllEvenementsWithEmail(): Promise<
  {
    email: string | null;
    groupesInstructeurs: string[] | null;
    date: Date;
    evenement: string;
    details: unknown | null;
  }[]
> {
  const groupesByPersonne = directDatabaseConnection("user_groupe as m")
    .join("groupe_instructeurs as g", "g.id", "m.groupe_instructeurs")
    .where("g.active", true)
    .select("m.user_id")
    .select(directDatabaseConnection.raw("array_agg(distinct g.name order by g.name) as groupes"))
    .groupBy("m.user_id")
    .as("groupes_par_personne");

  return directDatabaseConnection("evenement_metrique")
    .join("auth_user as personne", { "personne.id": "evenement_metrique.personne" })
    .leftJoin(groupesByPersonne, "groupes_par_personne.user_id", "personne.id")
    .select(
      "personne.email",
      "groupes_par_personne.groupes as groupesInstructeurs",
      "evenement_metrique.date",
      "evenement_metrique.evenement",
      "evenement_metrique.details",
    )
    .whereNot("personne.email", "like", "%beta.gouv%")
    .orderBy("evenement_metrique.date", "asc");
}

export async function deleteEvenementsBeforeDate(
  date: Date,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("evenement_metrique").where("date", "<", date).delete();
}

export type EvenementMetriqueRow = {
  id: string;
  email: string | null;
  date: Date;
  evenement: string;
  details: unknown | null;
};

export type EvenementMetriqueSortKey = "date" | "evenement" | "email";
export type EvenementMetriqueSortOrder = "asc" | "desc";

export type ListEvenementsMetriquesOptions = {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  /** Event types to keep (empty/undefined means every type). */
  evenements?: string[];
  /** Case-insensitive substring matched against the user email. */
  search?: string;
  /** Inclusive lower bound on the event date (YYYY-MM-DD). */
  dateFrom?: string;
  /** Inclusive upper bound on the event date (YYYY-MM-DD). */
  dateTo?: string;
  sort?: EvenementMetriqueSortKey;
  order?: EvenementMetriqueSortOrder;
};

const EVENEMENT_SORT_COLUMNS: Record<EvenementMetriqueSortKey, string> = {
  date: "evenement_metrique.date",
  evenement: "evenement_metrique.evenement",
  email: "personne.email",
};

/**
 * Applies the shared WHERE clauses (type, email search, date range) so the count
 * and the page query stay in sync. Written as a `.modify()` callback.
 */
function filterEvenementsMetriques(
  query: Knex.QueryBuilder,
  { evenements, search, dateFrom, dateTo }: ListEvenementsMetriquesOptions,
): void {
  if (evenements && evenements.length > 0) {
    query.whereIn("evenement_metrique.evenement", evenements);
  }
  if (search) {
    query.whereILike("personne.email", `%${search}%`);
  }
  if (dateFrom) {
    query.where("evenement_metrique.date", ">=", dateFrom);
  }
  if (dateTo) {
    // The bound is a day, the column a timestamp: « jusqu'au 15 » has to keep the
    // events of the 15th, so the whole day is included by excluding the next one.
    query.whereRaw("evenement_metrique.date < (?::date + interval '1 day')", [dateTo]);
  }
}

/**
 * Reads one page of tracked events, filtered and sorted server-side, along with
 * the total number of matching rows so the client can render pagination without
 * ever loading the whole table.
 */
export async function listEvenementsMetriques(
  options: ListEvenementsMetriquesOptions,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ evenements: EvenementMetriqueRow[]; total: number }> {
  const page = Math.max(1, Math.trunc(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Math.trunc(options.pageSize) || 50));
  const sortColumn = EVENEMENT_SORT_COLUMNS[options.sort ?? "date"];
  const order: EvenementMetriqueSortOrder = options.order === "asc" ? "asc" : "desc";

  const countRow = await databaseConnection("evenement_metrique")
    .join("auth_user as personne", { "personne.id": "evenement_metrique.personne" })
    .modify((query) => filterEvenementsMetriques(query, options))
    .count<{ count: string }>({ count: "*" })
    .first();

  const total = Number(countRow?.count ?? 0);

  const evenements: EvenementMetriqueRow[] = await databaseConnection("evenement_metrique")
    .join("auth_user as personne", { "personne.id": "evenement_metrique.personne" })
    .modify((query) => filterEvenementsMetriques(query, options))
    .select(
      "evenement_metrique.id",
      "personne.email",
      "evenement_metrique.date",
      "evenement_metrique.evenement",
      "evenement_metrique.details",
    )
    // Secondary sort by id keeps the order stable when the sort column ties.
    .orderBy(sortColumn, order)
    .orderBy("evenement_metrique.id", "asc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { evenements, total };
}

/**
 * Distinct event types present in the table, for the filter dropdown.
 */
export async function listEvenementMetriqueTypes(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string[]> {
  const rows = await databaseConnection("evenement_metrique")
    .distinct("evenement")
    .orderBy("evenement", "asc");
  return rows.map((row) => row.evenement);
}
