import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

function meaningfulEvents(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query.andWhere(function () {
    this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
  });
}

export async function dossiersAccessibleViaCap(
  dossierIds: Dossier["id"] | Dossier["id"][],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Set<Dossier["id"]>> {
  const ids = Array.isArray(dossierIds) ? dossierIds : [dossierIds];
  const rows = await databaseConnection("edge_cap_dossier__groupe_instructeurs")
    .select(["dossier.id as id"])
    .leftJoin("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.groupe_instructeurs":
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("dossier", { "dossier.id": "edge_groupe_instructeurs__dossier.dossier" })
    .whereIn("dossier.id", ids)
    .andWhere({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap });
  return new Set(rows.map(({ id }) => id));
}

function eventsByCap(cap: CapDossier["cap"], databaseConnection: Knex.Transaction | Knex) {
  return meaningfulEvents(
    databaseConnection("evenement_phase_dossier")
      .select(["evenement_phase_dossier.dossier as dossier", "phase", "timestamp"])
      .join("edge_groupe_instructeurs__dossier", {
        "edge_groupe_instructeurs__dossier.dossier": "evenement_phase_dossier.dossier",
      })
      .join("edge_cap_dossier__groupe_instructeurs", {
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
          "edge_groupe_instructeurs__dossier.groupe_instructeurs",
      })
      .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap }),
  );
}

export async function getLatestEvenementsPhaseDossiers(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return eventsByCap(cap, databaseConnection)
    .distinctOn("dossier")
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "timestamp", order: "desc" },
    ]);
}

export async function getEvenementsPhaseDossiers(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<EvenementPhaseDossier[]> {
  return eventsByCap(cap, databaseConnection);
}

export async function getEvenementsPhaseDossier(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<EvenementPhaseDossier[]> {
  return meaningfulEvents(
    databaseConnection("evenement_phase_dossier").select("*").where({ dossier: dossierId }),
  ).orderBy("timestamp", "desc");
}
