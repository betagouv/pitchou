import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";

function meaningfulEvents(query: Knex.QueryBuilder): Knex.QueryBuilder {
  return query.andWhere(function () {
    this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
  });
}

// A cap reaches a dossier either through the groupe instructing it, or through a
// groupe it was shared with in read-only mode. A dossier can be both — a service
// may be shown a dossier it later takes over — so the most permissive wins.
const accessQuery = `
  select dossier, bool_or(complet) as complet from (
    select edge_groupe_instructeurs__dossier.dossier, true as complet
      from edge_cap_dossier__groupe_instructeurs
      join edge_groupe_instructeurs__dossier
        on edge_groupe_instructeurs__dossier.groupe_instructeurs
         = edge_cap_dossier__groupe_instructeurs.groupe_instructeurs
     where edge_cap_dossier__groupe_instructeurs.cap_dossier = :cap
       and edge_groupe_instructeurs__dossier.dossier = any(:ids)
    union all
    select edge_groupe_instructeurs__dossier_lecture.dossier, false
      from edge_cap_dossier__groupe_instructeurs
      join edge_groupe_instructeurs__dossier_lecture
        on edge_groupe_instructeurs__dossier_lecture.groupe_instructeurs
         = edge_cap_dossier__groupe_instructeurs.groupe_instructeurs
     where edge_cap_dossier__groupe_instructeurs.cap_dossier = :cap
       and edge_groupe_instructeurs__dossier_lecture.dossier = any(:ids)
  ) as reachable
  group by dossier`;

/**
 * The dossiers among `dossierIds` this cap reaches, and with what access.
 *
 * A `Map`, so callers that only ask whether the dossier is reachable keep using
 * `.has()`, while anything that may write must read the level with `.get()`.
 */
export async function dossiersAccessibleViaCap(
  dossierIds: Dossier["id"] | Dossier["id"][],
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Map<Dossier["id"], DossierAccess>> {
  const ids = Array.isArray(dossierIds) ? dossierIds : [dossierIds];
  const { rows } = await databaseConnection.raw(accessQuery, { cap, ids });
  return new Map(
    rows.map(({ dossier, complet }: { dossier: Dossier["id"]; complet: boolean }) => [
      dossier,
      complet ? "complet" : "lecture",
    ]),
  );
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
