import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";

type AuthorizedFile = Pick<File, "id" | "name" | "media_type" | "size">;

export async function getAuthorizedDossierFiles(
  dossierId: Dossier["id"],
  fileIds: File["id"][],
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AuthorizedFile[]> {
  if (fileIds.length === 0) return [];

  const [project, avisSaisine, avis, decisions, others] = await Promise.all([
    db("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
    db("avis_expert")
      .where({ dossier: dossierId })
      .whereIn("saisine_fichier", fileIds)
      .pluck("saisine_fichier"),
    db("avis_expert")
      .where({ dossier: dossierId })
      .whereIn("avis_fichier", fileIds)
      .pluck("avis_fichier"),
    db("decision_administrative")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
    db("other_attachment")
      .where({ dossier: dossierId })
      .whereIn("fichier", fileIds)
      .pluck("fichier"),
  ]);
  const authorizedIds = new Set([...project, ...avisSaisine, ...avis, ...decisions, ...others]);
  if (fileIds.some((id) => !authorizedIds.has(id))) return [];

  return db("file").select(["id", "name", "media_type", "size"]).whereIn("id", fileIds);
}
