import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import type { DossierSource } from "@pitchou/types/dossierSource.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";

export { getDossierDetailForAdmin } from "./dossier_admin_detail.ts";
export type {
  AdminDossierDetail,
  AdminPhaseHistoryEntry,
  AdminPieceJointe,
} from "./dossier_admin_detail.ts";

/** Phase of a dossier that has no phase event yet. */
const DEFAULT_PHASE: DossierPhase = "Accompagnement amont";

export type AdminDossierSummary = {
  id: DossierId;
  name: string | null;
  demarche_numerique_number: string | null;
  source: DossierSource;
  depot_date: Date;
  phase: DossierPhase;
  demandeur_last_name: string | null;
  demandeur_first_names: string | null;
  demandeur_entreprise: string | null;
  groupe_name: string | null;
};

export type ListAdminDossiersOptions = {
  page: number;
  pageSize: number;
  search?: string;
  phase?: DossierPhase;
  source?: "pitchou" | "dn" | "unknown";
};

/** Latest meaningful phase event per dossier, excluding sync noise. */
function latestPhaseSubquery(databaseConnection: Knex.Transaction | Knex) {
  return databaseConnection("evenement_phase_dossier")
    .distinctOn("dossier")
    .select(["dossier", "phase"])
    .where(function () {
      this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
    })
    .orderBy([
      { column: "dossier", order: "asc" },
      { column: "timestamp", order: "desc" },
    ])
    .as("latest_phase");
}

function joinDossierRelations(
  query: Knex.QueryBuilder,
  databaseConnection: Knex.Transaction | Knex,
): Knex.QueryBuilder {
  return query
    .leftJoin(latestPhaseSubquery(databaseConnection), {
      "latest_phase.dossier": "dossier.id",
    })
    .leftJoin("personne as demandeur_pp", {
      "demandeur_pp.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise", { "entreprise.siret": "dossier.demandeur_personne_morale" })
    .leftJoin("edge_groupe_instructeurs__dossier as edge_groupe", {
      "edge_groupe.dossier": "dossier.id",
    })
    .leftJoin("groupe_instructeurs", {
      "groupe_instructeurs.id": "edge_groupe.groupe_instructeurs",
    });
}

/** Shared WHERE clauses so the count and page query stay in sync. */
function filterAdminDossiers(
  query: Knex.QueryBuilder,
  { search, phase, source }: ListAdminDossiersOptions,
): void {
  if (search) {
    query.where(function () {
      this.whereILike("dossier.name", `%${search}%`)
        .orWhereILike("entreprise.legal_name", `%${search}%`)
        .orWhereILike("demandeur_pp.last_name", `%${search}%`)
        .orWhere("dossier.demarche_numerique_number", search);
    });
  }
  if (phase) {
    query.whereRaw(`COALESCE(latest_phase.phase, ?) = ?`, [DEFAULT_PHASE, phase]);
  }
  if (source === "pitchou") {
    query.where("dossier.source", "pitchou");
  } else if (source === "dn") {
    query.where("dossier.source", "demarche_numerique");
  } else if (source === "unknown") {
    query.where("dossier.source", "unknown");
  }
}

/** One page of dossiers for the admin list, with the total for pagination. */
export async function listDossiersForAdmin(
  options: ListAdminDossiersOptions,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ dossiers: AdminDossierSummary[]; total: number }> {
  const page = Math.max(1, Math.trunc(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Math.trunc(options.pageSize) || 50));
  const countRow = await joinDossierRelations(databaseConnection("dossier"), databaseConnection)
    .modify((query) => filterAdminDossiers(query, options))
    .count<{ count: string }>({ count: "dossier.id" })
    .first();
  const total = Number(countRow?.count ?? 0);

  const dossiers: AdminDossierSummary[] = await joinDossierRelations(
    databaseConnection("dossier"),
    databaseConnection,
  )
    .modify((query) => filterAdminDossiers(query, options))
    .select([
      "dossier.id",
      "dossier.name",
      "dossier.demarche_numerique_number",
      "dossier.source",
      "dossier.depot_date",
      databaseConnection.raw(`COALESCE(latest_phase.phase, ?) as phase`, [DEFAULT_PHASE]),
      "demandeur_pp.last_name as demandeur_last_name",
      "demandeur_pp.first_names as demandeur_first_names",
      "entreprise.legal_name as demandeur_entreprise",
      "groupe_instructeurs.name as groupe_name",
    ])
    .orderBy("dossier.depot_date", "desc")
    .orderBy("dossier.id", "desc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { dossiers, total };
}

/** Groupes instructeurs for the admin creation form selector. */
export function listGroupesInstructeursForAdmin(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<GroupeInstructeurs, "id" | "name" | "demarche_number">[]> {
  return databaseConnection("groupe_instructeurs")
    .select(["id", "name", "demarche_number"])
    .orderBy("name", "asc");
}
