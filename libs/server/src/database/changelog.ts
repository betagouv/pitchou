import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { deleteAllChangelogMedia } from "../changelogMedia.ts";
import { sanitizeChangelogContenu } from "./changelog/sanitize.ts";

export { sanitizeChangelogContenu } from "./changelog/sanitize.ts";
export { isValidIdParam, validateChangelogPayload } from "./changelog/validation.ts";
export type { ChangelogPayload } from "./changelog/validation.ts";

// `date` is a pg DATE; selected raw it would surface as a JS Date parsed in the
// server timezone. Every select goes through to_char instead, so dates stay
// plain YYYY-MM-DD strings end-to-end (which also sort correctly as strings).
const DATE_AS_STRING = "to_char(date, 'YYYY-MM-DD') as date";

export type PublishedChangelogEntry = {
  /** Joined « X.Y.Z » — the public URL segment (published entries are complete). */
  version: string;
  date: string;
  titre: string;
  contenu: string;
};

export type ChangelogEntry = {
  id: number;
  /** `null` segments while the draft's version is empty or half-typed. */
  version_major: number | null;
  version_minor: number | null;
  version_patch: number | null;
  date: string;
  titre: string;
  contenu: string;
  published: boolean;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
};

type ChangelogEntryColumns = {
  version_major: number | null;
  version_minor: number | null;
  version_patch: number | null;
  date: string;
  titre: string;
  contenu: string;
  published: boolean;
  updated_by: string;
};

/** Published entries only, most recent first, for the public « Nouveautés » page. */
export async function listPublishedChangelogEntries(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<PublishedChangelogEntry[]> {
  const rows: (Pick<ChangelogEntry, "version_major" | "version_minor" | "version_patch"> & {
    date: string;
    titre: string;
    contenu: string;
  })[] = await databaseConnection("changelog")
    .select(
      "version_major",
      "version_minor",
      "version_patch",
      databaseConnection.raw(DATE_AS_STRING),
      "titre",
      "contenu",
    )
    .where("published", true)
    // Version order, not date order: entries can be written retroactively, and
    // the public prev/next navigation must follow the version sequence.
    .orderBy([
      { column: "version_major", order: "desc" },
      { column: "version_minor", order: "desc" },
      { column: "version_patch", order: "desc" },
    ]);

  // Published entries always carry a complete version (enforced at write time).
  return rows.map(({ version_major, version_minor, version_patch, ...entry }) => ({
    ...entry,
    version: `${version_major}.${version_minor}.${version_patch}`,
  }));
}

function adminColumns(databaseConnection: Knex.Transaction | Knex) {
  return [
    "id",
    "version_major",
    "version_minor",
    "version_patch",
    databaseConnection.raw(DATE_AS_STRING),
    "titre",
    "contenu",
    "published",
    "updated_by",
    "created_at",
    "updated_at",
  ];
}

/** Every entry, drafts included, most recent first, for the admin pages. */
export function listChangelogEntries(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ChangelogEntry[]> {
  return databaseConnection("changelog")
    .select(adminColumns(databaseConnection))
    .orderBy([
      { column: "date", order: "desc" },
      { column: "id", order: "desc" },
    ]);
}

/** One entry (draft or published), or `undefined` when `id` does not exist. */
export function getChangelogEntry(
  id: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ChangelogEntry | undefined> {
  return databaseConnection("changelog")
    .select(adminColumns(databaseConnection))
    .where({ id })
    .first();
}

/**
 * Creates an entry and returns its id. `contenu` is sanitized here so no code
 * path can write unsanitized HTML to the database. Rejects with a pg
 * unique-violation (code 23505) when the complete version is already taken.
 */
export async function createChangelogEntry(
  entry: ChangelogEntryColumns,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  // A not-yet-created entry cannot have uploads, hence the `null` media scope.
  const [row] = await databaseConnection("changelog")
    .insert({ ...entry, contenu: sanitizeChangelogContenu(entry.contenu, null) })
    .returning<{ id: number }[]>("id");
  return row.id;
}

/** Updates the entry `id` in full; sanitizes `contenu` like the creation path. */
export async function updateChangelogEntry(
  id: number,
  entry: ChangelogEntryColumns,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("changelog")
    .where({ id })
    .update({
      ...entry,
      contenu: sanitizeChangelogContenu(entry.contenu, id),
      updated_at: databaseConnection.fn.now(),
    });
}

export async function deleteChangelogEntry(
  id: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection("changelog").where({ id }).delete();
  // Best-effort: a leftover S3 object is invisible (nothing links to it anymore).
  await deleteAllChangelogMedia(id).catch((err) => {
    console.error(`Échec suppression des médias S3 du changelog ${id}`, err.message);
  });
}
