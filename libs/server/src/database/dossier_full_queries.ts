import type { Knex } from "knex";
import type AvisExpert from "@pitchou/types/database/public/AvisExpert.ts";
import type DecisionAdministrative from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";

export type AvisWithFiles = AvisExpert & {
  avis_file_name: File["name"];
  avis_fichier_media_type: File["media_type"];
  avis_file_size: number | null;
  saisine_file_name: File["name"];
  saisine_fichier_media_type: File["media_type"];
  saisine_file_size: number | null;
};
export type DecisionWithFile = DecisionAdministrative & {
  file_name: File["name"];
  file_media_type: File["media_type"];
  file_size: number | null;
};

export function getAvisExpertDossier(
  dossierId: Dossier["id"],
  db: Knex.Transaction,
): Promise<AvisWithFiles[]> {
  return db("avis_expert")
    .select([
      "avis_expert.*",
      "file_avis.name as avis_file_name",
      "file_avis.media_type as avis_fichier_media_type",
      db.raw("file_avis.size::integer as avis_file_size"),
      "file_saisine.name as saisine_file_name",
      "file_saisine.media_type as saisine_fichier_media_type",
      db.raw("file_saisine.size::integer as saisine_file_size"),
    ])
    .leftJoin("file as file_avis", { "file_avis.id": "avis_expert.avis_fichier" })
    .leftJoin("file as file_saisine", { "file_saisine.id": "avis_expert.saisine_fichier" })
    .where({ dossier: dossierId });
}

export function getDecisionsDossier(
  dossierId: Dossier["id"],
  db: Knex.Transaction,
): Promise<DecisionWithFile[]> {
  return db("decision_administrative")
    .select([
      "decision_administrative.*",
      "file_decision.name as file_name",
      "file_decision.media_type as file_media_type",
      db.raw("file_decision.size::integer as file_size"),
    ])
    .leftJoin("file as file_decision", { "file_decision.id": "decision_administrative.fichier" })
    .where({ dossier: dossierId });
}

export function getPiecesJointes(
  dossierId: Dossier["id"],
  db: Knex.Transaction,
): Promise<
  (Pick<File, "demarche_numerique_created_at" | "id" | "name" | "media_type"> & { size: number })[]
> {
  return db("dossier")
    .select([
      "file.id as id",
      "file.demarche_numerique_created_at as demarche_numerique_created_at",
      "file.name as name",
      "file.media_type as media_type",
      db.raw("file.size::integer as size"),
    ])
    .leftJoin("edge_dossier__fichier_pieces_jointes_petitionnaire", {
      "edge_dossier__fichier_pieces_jointes_petitionnaire.dossier": "dossier.id",
    })
    .leftJoin("file", { "file.id": "edge_dossier__fichier_pieces_jointes_petitionnaire.fichier" })
    .where({ dossier: dossierId });
}
