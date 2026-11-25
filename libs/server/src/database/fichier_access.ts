import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type File from "@pitchou/types/database/public/File.ts";

/**
 * How a file hangs off a dossier. Deduplicated files can have several relations,
 * but a download route only serves its own kinds of attachment.
 */
export type FichierRelation =
  | "avis"
  | "saisine"
  | "decision-administrative"
  | "especes-impactees"
  | "piece-jointe-petitionnaire"
  | "attachment-autre";

export type FichierAttachment = {
  dossier: DossierId;
  relation: FichierRelation;
  /** The consulted expert, for an `avis` or a `saisine`. Null for anything else. */
  expert: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// Global file deduplication can link the same file to several dossiers and
// relations. Keep every edge so authorization can evaluate each one.
const attachmentQuery = `
  select dossier, fichier, relation, expert from (
    select dossier, avis_fichier as fichier, 'avis' as relation, expert from avis_expert
    union all
    select dossier, saisine_fichier, 'saisine', expert from avis_expert
    union all
    select dossier, fichier, 'decision-administrative', null::text from decision_administrative
    union all
    select id, especes_impactees, 'especes-impactees', null::text from dossier
    union all
    select dossier, fichier, 'piece-jointe-petitionnaire', null::text
      from edge_dossier__fichier_pieces_jointes_petitionnaire
    union all
    select dossier, fichier, 'attachment-autre', null::text from other_attachment
  ) as attachment`;

/**
 * Finds every dossier/relation for a file. An empty array means the file does not
 * exist or has no attachments; either way, nobody may download it.
 */
export async function findFichierAttachments(
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FichierAttachment[]> {
  // The columns are uuids: anything else would make Postgres raise rather than
  // return no row.
  if (!UUID.test(fileId)) return [];

  const { rows } = await databaseConnection.raw(
    `select dossier, relation, expert from (${attachmentQuery}) as files where fichier = ?`,
    [fileId],
  );
  return rows as FichierAttachment[];
}

type FichierMetadata = FichierAttachment &
  Pick<
    File,
    "id" | "name" | "media_type" | "size" | "created_at" | "demarche_numerique_created_at"
  > & {
    type_piece: string | null;
    date_piece: Date | null;
  };

export function listDossierFichiers(
  dossierId: DossierId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FichierMetadata[]> {
  return db(db.raw(`(${attachmentQuery}) as files`))
    .join("file", "file.id", "files.fichier")
    .leftJoin("other_attachment as other", (join) =>
      join
        .on("other.fichier", "files.fichier")
        .on("other.dossier", "files.dossier")
        .andOnVal("files.relation", "attachment-autre"),
    )
    .where("files.dossier", dossierId)
    .distinct(
      "files.dossier",
      "files.relation",
      "files.expert",
      "file.id",
      "file.name",
      "file.media_type",
      "file.size",
      "file.created_at",
      "file.demarche_numerique_created_at",
      "other.type as type_piece",
      "other.attachment_date as date_piece",
    )
    .orderBy([
      "files.relation",
      "file.name",
      "file.id",
      "files.expert",
      "type_piece",
      "date_piece",
    ]);
}
