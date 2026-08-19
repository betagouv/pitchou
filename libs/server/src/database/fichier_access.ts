import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

/**
 * How a file hangs off its dossier. Every file the instructeur app serves is
 * attached through exactly one of these, and each download route serves one kind
 * — so a saisine cannot be fetched through the décision administrative route.
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

// One pass over every table holding a foreign key to `file`. A file is attached
// once, so the first row is the answer.
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
  ) as attachment
  limit 1`;

/**
 * Finds the dossier a file belongs to, and how. Undefined when the file does not
 * exist or hangs off nothing — either way, nobody may download it.
 */
export async function findFichierAttachment(
  fileId: FileId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<FichierAttachment | undefined> {
  // The columns are uuids: anything else would make Postgres raise rather than
  // return no row.
  if (!UUID.test(fileId)) return undefined;

  const { rows } = await databaseConnection.raw(attachmentQuery, { fileId });
  return rows[0] as FichierAttachment | undefined;
}
