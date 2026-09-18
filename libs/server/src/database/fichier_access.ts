import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Global file deduplication can link the same file to several dossiers and
// relations. Keep every edge so authorization can evaluate each one.
const attachmentQuery = `
  select dossier, relation, expert from (
    select dossier, 'avis' as relation, expert
      from avis_expert where avis_fichier = :fileId
    union all
    select dossier, 'saisine', expert
      from avis_expert where saisine_fichier = :fileId
    union all
    select dossier, 'decision-administrative', null::text
      from decision_administrative where fichier = :fileId
    union all
    select id, 'especes-impactees', null::text
      from dossier where especes_impactees = :fileId
    union all
    select dossier, 'piece-jointe-petitionnaire', null::text
      from edge_dossier__fichier_pieces_jointes_petitionnaire where fichier = :fileId
    union all
    select dossier, 'attachment-autre', null::text
      from other_attachment where fichier = :fileId
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

  const { rows } = await databaseConnection.raw(attachmentQuery, { fileId });
  return rows as FichierAttachment[];
}
