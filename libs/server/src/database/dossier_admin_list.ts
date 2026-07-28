import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { DossierNotFoundError } from "./dossier_admin.ts";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import type IdentiteDossier from "@pitchou/types/database/public/IdentiteDossier.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type File from "@pitchou/types/database/public/File.ts";

/** Phase of a dossier that has no phase event yet. */
const DEFAULT_PHASE: DossierPhase = "Accompagnement amont";

export type AdminDossierSummary = {
  id: DossierId;
  name: string | null;
  demarche_numerique_number: string | null;
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
  /** "pitchou" = created in Pitchou, "dn" = imported from Demarche Numerique */
  source?: "pitchou" | "dn";
};

export type AdminPhaseHistoryEntry = {
  phase: DossierPhase;
  timestamp: Date;
  caused_by_email: string | null;
  demarche_numerique_agent_email: string | null;
};

export type AdminPieceJointe = {
  id: File["id"];
  name: string;
  media_type: string | null;
  size: number | null;
  created_at: Date;
  demarche_numerique_created_at: Date | null;
};

export type AdminDossierDetail = {
  dossier: Dossier;
  managedByDn: boolean;
  phase: DossierPhase;
  demandeur_personne_physique: Personne | null;
  demandeur_personne_morale: Entreprise | null;
  groupe: Pick<GroupeInstructeurs, "id" | "name"> | null;
  identites: IdentiteDossier[];
  evenementsPhase: AdminPhaseHistoryEntry[];
  piecesJointes: AdminPieceJointe[];
  especesImpactees: Pick<File, "id" | "name" | "media_type"> | null;
};

/**
 * Latest meaningful phase event per dossier. Events with neither a
 * caused_by_personne nor a demarche_numerique_agent_email are sync noise
 * (bad DS "traitements") and are ignored, like everywhere else in the app.
 */
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

/** Shared WHERE clauses so the count and the page query stay in sync. */
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
    query.whereNull("dossier.demarche_numerique_number");
  } else if (source === "dn") {
    query.whereNotNull("dossier.demarche_numerique_number");
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

/** Everything the admin edit page needs about one dossier. */
export async function getDossierDetailForAdmin(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AdminDossierDetail> {
  const dossier: Dossier | undefined = await databaseConnection("dossier")
    .select("*")
    .where({ id: dossierId })
    .first();
  if (!dossier) throw new DossierNotFoundError(dossierId);

  const [demandeurPersonnePhysique, demandeurPersonneMorale, groupe, identites, evenementsPhase] =
    await Promise.all([
      dossier.demandeur_personne_physique
        ? databaseConnection("personne")
            .select("*")
            .where({ id: dossier.demandeur_personne_physique })
            .first()
        : null,
      dossier.demandeur_personne_morale
        ? databaseConnection("entreprise")
            .select("*")
            .where({ siret: dossier.demandeur_personne_morale })
            .first()
        : null,
      databaseConnection("edge_groupe_instructeurs__dossier")
        .select(["groupe_instructeurs.id", "groupe_instructeurs.name"])
        .join("groupe_instructeurs", {
          "groupe_instructeurs.id": "edge_groupe_instructeurs__dossier.groupe_instructeurs",
        })
        .where({ "edge_groupe_instructeurs__dossier.dossier": dossierId })
        .first(),
      databaseConnection("identite_dossier").select("*").where({ dossier: dossierId }),
      databaseConnection("evenement_phase_dossier")
        .select([
          "evenement_phase_dossier.phase",
          "evenement_phase_dossier.timestamp",
          "personne.email as caused_by_email",
          "evenement_phase_dossier.demarche_numerique_agent_email",
        ])
        .leftJoin("personne", { "personne.id": "evenement_phase_dossier.caused_by_personne" })
        .where({ dossier: dossierId })
        .andWhere(function () {
          this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
        })
        .orderBy("timestamp", "desc"),
    ]);

  const piecesJointes: AdminPieceJointe[] = await databaseConnection(
    "edge_dossier__fichier_pieces_jointes_petitionnaire",
  )
    .select([
      "file.id",
      "file.name",
      "file.media_type",
      databaseConnection.raw("file.size::integer as size"),
      "file.created_at",
      "file.demarche_numerique_created_at",
    ])
    .join("file", { "file.id": "edge_dossier__fichier_pieces_jointes_petitionnaire.fichier" })
    .where({ "edge_dossier__fichier_pieces_jointes_petitionnaire.dossier": dossierId })
    .orderBy("file.created_at", "desc");

  const especesImpactees = dossier.especes_impactees
    ? await databaseConnection("file")
        .select(["id", "name", "media_type"])
        .where({ id: dossier.especes_impactees })
        .first()
    : null;

  return {
    dossier,
    managedByDn: dossier.demarche_numerique_number !== null,
    phase: evenementsPhase[0]?.phase ?? DEFAULT_PHASE,
    demandeur_personne_physique: demandeurPersonnePhysique ?? null,
    demandeur_personne_morale: demandeurPersonneMorale ?? null,
    groupe: groupe ?? null,
    identites,
    evenementsPhase,
    piecesJointes,
    especesImpactees: especesImpactees ?? null,
  };
}

/** Groupes instructeurs for the admin creation form selector. */
export function listGroupesInstructeursForAdmin(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Pick<GroupeInstructeurs, "id" | "name" | "demarche_number">[]> {
  return databaseConnection("groupe_instructeurs")
    .select(["id", "name", "demarche_number"])
    .orderBy("name", "asc");
}
