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
  phase: DossierPhase | null;
  main_activite: string | null;
  activite_code: string | null;
  activite_label: string | null;
  demandeur_last_name: string | null;
  demandeur_first_names: string | null;
  demandeur_entreprise: string | null;
  groupe_name: string | null;
};
export type AdminDossierSortKey = "depot_date" | "name" | "phase";

/** A summary plus the extra columns the statistics export needs. */
export type AdminDossierExportRow = AdminDossierSummary & {
  phase_date: Date | null;
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
    .select(["dossier", "phase", "timestamp"])
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
function summaryColumns() {
  return [
    "dossier.id",
    "dossier.name",
    "dossier.demarche_numerique_number",
    "dossier.source",
    "dossier.depot_date",
    "dossier.main_activite",
    "activite.code as activite_code",
    "activite.label as activite_label",
    "latest_phase.phase as phase",
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
  if (options.phase) query.where("latest_phase.phase", options.phase);
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
      query.orderBy("latest_phase.phase", order);
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
    .select(summaryColumns())
    .modify((q) => orderResults(q, options))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { dossiers: dossiers.map(withResolvedActivite), total: Number(count?.count ?? 0) };
}
/**
 * @param db
 * @returns every dossier, with the extra columns the statistics export needs
 */
export function listDossiersForExport(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AdminDossierExportRow[]> {
  return withRelations(db("dossier"), db)
    .select([
      ...summaryColumns(),
      "latest_phase.timestamp as phase_date",
      "dossier.primary_department",
      "dossier.departments",
      "dossier.communes",
      "dossier.regions",
    ])
    .orderBy("dossier.depot_date", "desc")
    .orderBy("dossier.id", "desc")
    .then((rows: AdminDossierExportRow[]) => rows.map(withResolvedActivite));
}

export type AdminAvisExpertExportRow = {
  dossier: DossierId;
  expert: string | null;
  saisine_date: Date | null;
  saisine_fichier: string | null;
  avis: string | null;
  avis_date: Date | null;
  avis_fichier: string | null;
};

export function listAvisExpertForExport(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AdminAvisExpertExportRow[]> {
  return db("avis_expert")
    .leftJoin("file as file_saisine", { "file_saisine.id": "avis_expert.saisine_fichier" })
    .leftJoin("file as file_avis", { "file_avis.id": "avis_expert.avis_fichier" })
    .select([
      "avis_expert.dossier",
      "avis_expert.expert",
      "avis_expert.saisine_date",
      "file_saisine.name as saisine_fichier",
      "avis_expert.avis",
      "avis_expert.avis_date",
      "file_avis.name as avis_fichier",
    ])
    .orderBy("avis_expert.dossier", "desc")
    .orderBy("avis_expert.saisine_date", "desc");
}

export function listGroupesInstructeursForAdmin(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<GroupeInstructeurs, "id" | "name" | "demarche_number">[]> {
  return db("groupe_instructeurs").select(["id", "name", "demarche_number"]).orderBy("name", "asc");
}
