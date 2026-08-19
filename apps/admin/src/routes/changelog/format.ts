import type { ChangelogEntryAdmin } from "$lib/actions/adminChangelog.ts";

type VersionSegments = Pick<
  ChangelogEntryAdmin,
  "version_major" | "version_minor" | "version_patch"
>;

/** « X.Y.Z » when complete, `null` while the version is empty or half-typed. */
export function versionOf(entry: VersionSegments): string | null {
  const { version_major, version_minor, version_patch } = entry;
  if (version_major === null || version_minor === null || version_patch === null) return null;
  return `${version_major}.${version_minor}.${version_patch}`;
}

export function formatDate(date: string): string {
  // Noon keeps the plain YYYY-MM-DD date on the right day in every timezone.
  return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("fr-FR");
}
