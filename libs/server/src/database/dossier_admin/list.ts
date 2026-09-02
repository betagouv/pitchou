import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { withResolvedActivite } from "../activite.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { DossierSource } from "@pitchou/types/dossierSource.ts";

export type AdminDossierSummary = {
  id: DossierId;
  name: string | null;
  demarche_numerique_number: string | null;
  source: DossierSource;
  depot_date: Date;
  phase: DossierPhase;
  main_activite: string | null;
  activite_code: string | null;
  activite_label: string | null;
  demandeur_last_name: string | null;
  demandeur_first_names: string | null;
  demandeur_entreprise: string | null;
  groupe_name: string | null;
};
export type AdminDossierSortKey = "depot_date" | "name" | "phase";

/** A summary plus the extra columns the yearly statistics export needs. */
export type AdminDossierExportRow = AdminDossierSummary & {
  primary_department: string | null;
  departments: unknown | null;
  communes: unknown | null;
  regions: unknown | null;
};
export type ListAdminDossiersOptions = {
  page: number;
  pageSize: number;
  search?: string;
  phase?: DossierPhase;
  source?: "pitchou" | "dn" | "unknown";
  sort?: AdminDossierSortKey;
  order?: "asc" | "desc";
};

function latestPhase(db: Knex.Transaction | Knex) {
  return db("evenement_phase_dossier")
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
function withRelations(query: Knex.QueryBuilder, db: Knex.Transaction | Knex) {
  return (
    query
      .leftJoin(latestPhase(db), { "latest_phase.dossier": "dossier.id" })
      .leftJoin("personne as demandeur_pp", {
        "demandeur_pp.id": "dossier.demandeur_personne_physique",
      })
      .leftJoin("entreprise", { "entreprise.siret": "dossier.demandeur_personne_morale" })
      .leftJoin("edge_groupe_instructeurs__dossier as edge_groupe", {
        "edge_groupe.dossier": "dossier.id",
      })
      .leftJoin("groupe_instructeurs", {
        "groupe_instructeurs.id": "edge_groupe.groupe_instructeurs",
      })
      // Only reviewed labels resolve to an activity; labels pending review keep their raw display
      // through the fallback in `withResolvedActivite`.
      .leftJoin("activite_label", (join) =>
        join
          .on("activite_label.label", "dossier.main_activite")
          .andOnVal("activite_label.needs_review", false),
      )
      .leftJoin("activite", { "activite.code": "activite_label.activite_code" })
  );
}
function summaryColumns(db: Knex.Transaction | Knex) {
  return [
    "dossier.id",
    "dossier.name",
    "dossier.demarche_numerique_number",
    "dossier.source",
    "dossier.depot_date",
    "dossier.main_activite",
    "activite.code as activite_code",
    "activite.label as activite_label",
    db.raw(`COALESCE(latest_phase.phase, ?) as phase`, ["Accompagnement amont"]),
    "demandeur_pp.last_name as demandeur_last_name",
    "demandeur_pp.first_names as demandeur_first_names",
    "entreprise.legal_name as demandeur_entreprise",
    "groupe_instructeurs.name as groupe_name",
  ];
}
function filter(query: Knex.QueryBuilder, options: ListAdminDossiersOptions): void {
  if (options.search)
    query.where(function () {
      this.whereILike("dossier.name", `%${options.search}%`)
        .orWhereILike("entreprise.legal_name", `%${options.search}%`)
        .orWhereILike("demandeur_pp.last_name", `%${options.search}%`)
        .orWhere("dossier.demarche_numerique_number", options.search);
    });
  if (options.phase)
    query.whereRaw(`COALESCE(latest_phase.phase, ?) = ?`, ["Accompagnement amont", options.phase]);
  if (options.source === "pitchou") query.where("dossier.source", "pitchou");
  else if (options.source === "dn") query.where("dossier.source", "demarche_numerique");
  else if (options.source === "unknown") query.where("dossier.source", "unknown");
}

function orderResults(query: Knex.QueryBuilder, options: ListAdminDossiersOptions): void {
  const order = options.order === "asc" ? "asc" : "desc";
  switch (options.sort) {
    case "name":
      query.orderBy("dossier.name", order);
      break;
    case "phase":
      query.orderByRaw(`COALESCE(latest_phase.phase, ?) ${order}`, ["Accompagnement amont"]);
      break;
    case "depot_date":
    default:
      query.orderBy("dossier.depot_date", order);
  }
  // Stable tie-break, whatever the primary key.
  query.orderBy("dossier.id", "desc");
}

export async function listDossiersForAdmin(
  options: ListAdminDossiersOptions,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ dossiers: AdminDossierSummary[]; total: number }> {
  const page = Math.max(1, Math.trunc(options.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Math.trunc(options.pageSize) || 50));
  const count = await withRelations(db("dossier"), db)
    .modify((q) => filter(q, options))
    .count<{ count: string }>({ count: "dossier.id" })
    .first();
  const dossiers: AdminDossierSummary[] = await withRelations(db("dossier"), db)
    .modify((q) => filter(q, options))
    .select(summaryColumns(db))
    .modify((q) => orderResults(q, options))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { dossiers: dossiers.map(withResolvedActivite), total: Number(count?.count ?? 0) };
}
/**
 *
 * @param year
 * @param db
 * @returns list of dossiers from the current year, which means dossier with a "depot_date" equal to this year
 */
export function listDossiersDeposesDuringYear(
  year: number,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AdminDossierExportRow[]> {
  return withRelations(db("dossier"), db)
    .where("dossier.depot_date", ">=", new Date(year, 0, 1))
    .where("dossier.depot_date", "<", new Date(year + 1, 0, 1))
    .select([
      ...summaryColumns(db),
      "dossier.primary_department",
      "dossier.departments",
      "dossier.communes",
      "dossier.regions",
    ])
    .orderBy("dossier.depot_date", "desc")
    .orderBy("dossier.id", "desc")
    .then((rows: AdminDossierExportRow[]) => rows.map(withResolvedActivite));
}

export function listGroupesInstructeursForAdmin(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<GroupeInstructeurs, "id" | "name" | "demarche_number">[]> {
  return db("groupe_instructeurs").select(["id", "name", "demarche_number"]).orderBy("name", "asc");
}
