import { AccessDeniedError } from "./errors.ts";

/** A changelog row as received from `/api/changelog` (timestamps JSON-serialized). */
export type ChangelogEntryAdmin = {
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
  created_at: string;
  updated_at: string;
};

export type ChangelogEntryPayload = {
  version_major: number | null;
  version_minor: number | null;
  version_patch: number | null;
  date: string;
  titre: string;
  contenu: string;
  published: boolean;
};

async function checkResponse(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 403) throw new AccessDeniedError();
  const message = await response.text();
  throw new Error(
    `Erreur ${response.status} lors de ${action} : ${message || response.statusText}`,
  );
}

/**
 * Loads every changelog entry (drafts included) for the admin pages. The Admin
 * app session cookie authenticates the request; the server answers 403 if the
 * session does not belong to an admin.
 */
export async function loadChangelogAdmin(): Promise<ChangelogEntryAdmin[]> {
  const response = await fetch(`/api/changelog`);
  await checkResponse(response, "du chargement du changelog");

  const entries = await response.json();
  if (!Array.isArray(entries)) {
    throw new Error("Réponse invalide reçue du serveur pour /api/changelog.");
  }

  return entries;
}

/** Creates an entry and returns its id. */
export async function createChangelogEntry(entry: ChangelogEntryPayload): Promise<number> {
  const response = await fetch(`/api/changelog`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  await checkResponse(response, "de la création de l'entrée");

  const { id } = await response.json();
  if (typeof id !== "number") {
    throw new Error("Réponse invalide reçue du serveur à la création de l'entrée.");
  }
  return id;
}

/** Updates the entry `id` in full (not a sparse patch). */
export async function saveChangelogEntry(id: number, entry: ChangelogEntryPayload): Promise<void> {
  const response = await fetch(`/api/changelog/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  await checkResponse(response, "de l'enregistrement de l'entrée");
}

/** Removes the entry `id`; it disappears from the public page immediately. */
export async function deleteChangelogEntry(id: number): Promise<void> {
  const response = await fetch(`/api/changelog/${id}`, { method: "DELETE" });
  await checkResponse(response, "de la suppression de l'entrée");
}
