import { json } from "d3-fetch";

export type PublishedChangelogEntry = {
  /** Editor-chosen « X.Y.Z », also the public URL segment. */
  version: string;
  /** Plain YYYY-MM-DD string. */
  date: string;
  titre: string;
  /** HTML sanitized server-side at write time. */
  contenu: string;
};

/**
 * Loads every published changelog entry (most recent first) from the backend.
 */
export async function loadPublishedChangelogEntries(): Promise<PublishedChangelogEntry[]> {
  try {
    const entries = await json(`/api/changelog`);
    if (!isPublishedChangelogEntries(entries)) {
      throw new Error(
        `Réponse invalide reçue du serveur pour la route /api/changelog. Réponse reçue : ${JSON.stringify(entries)}`,
      );
    }
    return entries;
  } catch (error) {
    console.error("Erreur lors du chargement des nouveautés :", error);
    throw new Error(`${error}`);
  }
}

/**
 * Checks whether the provided value matches the expected structure of
 * `PublishedChangelogEntry[]`.
 */
function isPublishedChangelogEntries(entries: any): entries is PublishedChangelogEntry[] {
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        Object(entry) === entry &&
        typeof entry.version === "string" &&
        typeof entry.date === "string" &&
        typeof entry.titre === "string" &&
        typeof entry.contenu === "string",
    )
  );
}
