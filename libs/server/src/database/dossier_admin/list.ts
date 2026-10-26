import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { withResolvedActivite } from "../activite.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { DossierSource } from "@pitchou/types/dossierSource.ts";
import {
  joinPorteurDeProjet,
  porteurDeProjetColumns,
  withPorteurDeProjet,
} from "../dossier/porteur.ts";
import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";
import { orderPhaseEvents } from "../phaseHistory.ts";

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
  porteur_de_projet: PorteurDeProjet | null;
  groupe_name: string | null;
};
export type AdminDossierSortKey = "depot_date" | "name" | "phase";
export type ListAdminDossiersOptions = {
  page: number;
  pageSize: number;
  search?: string;
  phase?: DossierPhase;
  source?: "pitchou" | "dn" | "onagre" | "unknown";
  sort?: AdminDossierSortKey;
  order?: "asc" | "desc";
};

function latestPhase(db: Knex.Transaction | Knex) {
  return db("evenement_phase_dossier")
    .distinctOn("dossier")
    .select(["dossier", "phase", "timestamp"])
    .orderBy("dossier", "asc")
    .modify(orderPhaseEvents)
    .as("latest_phase");
}
function withRelations(query: Knex.QueryBuilder, db: Knex.Transaction | Knex) {
  return (
    joinPorteurDeProjet(query)
      .leftJoin(latestPhase(db), { "latest_phase.dossier": "dossier.id" })
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
    "latest_phase.phase as phase",
    ...porteurDeProjetColumns,
    db.raw(
      "(select string_agg(g.name, ', ' order by g.name) from edge_groupe_instructeurs__dossier e join groupe_instructeurs g on g.id = e.groupe_instructeurs where e.dossier = dossier.id) as groupe_name",
    ),
  ];
}
function filter(query: Knex.QueryBuilder, options: ListAdminDossiersOptions): void {
  const { search } = options;
  if (search)
    query.where(function () {
      this.whereILike("dossier.name", `%${search}%`)
        .orWhereILike("porteur_entreprise.legal_name", `%${search}%`)
        .orWhereILike("porteur_pp.last_name", `%${search}%`)
        .orWhereILike("porteur_pp.first_names", `%${search}%`)
        .orWhere("porteur_entreprise.siret", search.replaceAll(/\s/gu, ""));
      // The DN number is a bigint: comparing it to a word would fail the whole query.
      if (/^\d+$/u.test(search)) this.orWhere("dossier.demarche_numerique_number", search);
    });
  if (options.phase) query.where("latest_phase.phase", options.phase);
  if (options.source === "pitchou") query.where("dossier.source", "pitchou");
  else if (options.source === "dn") query.where("dossier.source", "demarche_numerique");
  else if (options.source === "onagre") query.where("dossier.source", "onagre");
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
    .select(summaryColumns(db))
    .modify((q) => orderResults(q, options))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return {
    dossiers: dossiers.map((dossier) => withResolvedActivite(withPorteurDeProjet(dossier))),
    total: Number(count?.count ?? 0),
  };
}

export function listGroupesInstructeursForAdmin(
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<GroupeInstructeurs, "id" | "name" | "demarche_number">[]> {
  return db("groupe_instructeurs").select(["id", "name", "demarche_number"]).orderBy("name", "asc");
}

export function listUnmatchedDossiersForAdmin(
  db: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return db("dossier as d")
    .select("d.id", "d.name", "d.primary_department")
    .whereNotExists(
      db("edge_groupe_instructeurs__dossier as e")
        .select("e.dossier")
        .where("e.dossier", db.ref("d.id")),
    )
    .orderBy("d.id");
}
