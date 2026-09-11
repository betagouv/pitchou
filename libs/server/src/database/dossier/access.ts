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

// Existing caps can read every existing dossier. EXISTS keeps one row per dossier
// even when the cap belongs to several owning groups.
export function dossierAccessQuery(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex,
) {
  return databaseConnection("dossier")
    .select("dossier.id as dossier")
    .select(
      databaseConnection.raw(
        `case when exists (
      select 1 from edge_cap_dossier__groupe_instructeurs
      join edge_groupe_instructeurs__dossier using (groupe_instructeurs)
      where edge_cap_dossier__groupe_instructeurs.cap_dossier = ?
        and edge_groupe_instructeurs__dossier.dossier = dossier.id
    ) then 'complet' else 'lecture' end as access`,
        [cap],
      ),
    )
    .whereExists(databaseConnection("cap_dossier").select("cap").where({ cap }));
}

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
  const rows = await dossierAccessQuery(cap, databaseConnection).whereIn("dossier.id", ids);
  return new Map(
    rows.map(({ dossier, access }: { dossier: Dossier["id"]; access: DossierAccess }) => [
      dossier,
      access,
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
  // Summary enrichment is global; eventsByCap remains service-only for history.
  return meaningfulEvents(
    databaseConnection("evenement_phase_dossier")
      .select(["dossier", "phase", "timestamp"])
      .whereExists(databaseConnection("cap_dossier").select("cap").where({ cap })),
  )
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
