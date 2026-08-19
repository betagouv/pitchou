import type { ChangelogEntryAdmin, ChangelogEntryPayload } from "$lib/actions/adminChangelog.ts";

function toSegmentNumber(segment: string): number | null {
  return segment === "" ? null : Number(segment);
}

function toSegmentText(segment: number | null): string {
  return segment === null ? "" : String(segment);
}

/** The entry being edited, as reactive form fields. */
export class EntryModel {
  date = $state("");
  titre = $state("");
  contenu = $state("");
  published = $state(false);

  // One field per version segment: each one saves on its own, so a half-typed
  // version is persisted like anything else. Completeness only gates publishing.
  versionMajor = $state("");
  versionMinor = $state("");
  versionPatch = $state("");

  versionComplete = $derived(
    this.versionMajor !== "" && this.versionMinor !== "" && this.versionPatch !== "",
  );
  version = $derived(
    this.versionComplete ? `${this.versionMajor}.${this.versionMinor}.${this.versionPatch}` : null,
  );
  canPublish = $derived(this.titre.trim() !== "" && this.versionComplete);

  loadFrom(entry: ChangelogEntryAdmin): void {
    this.versionMajor = toSegmentText(entry.version_major);
    this.versionMinor = toSegmentText(entry.version_minor);
    this.versionPatch = toSegmentText(entry.version_patch);
    this.date = entry.date;
    this.titre = entry.titre;
    this.contenu = entry.contenu;
    this.published = entry.published;
  }

  snapshot(): ChangelogEntryPayload {
    return {
      version_major: toSegmentNumber(this.versionMajor),
      version_minor: toSegmentNumber(this.versionMinor),
      version_patch: toSegmentNumber(this.versionPatch),
      date: this.date,
      titre: this.titre,
      contenu: this.contenu,
      published: this.published,
    };
  }
}

export function sameSnapshot(a: ChangelogEntryPayload, b: ChangelogEntryPayload): boolean {
  return (
    a.version_major === b.version_major &&
    a.version_minor === b.version_minor &&
    a.version_patch === b.version_patch &&
    a.date === b.date &&
    a.titre === b.titre &&
    a.contenu === b.contenu &&
    a.published === b.published
  );
}
