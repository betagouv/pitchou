import { AccessDeniedError } from "./errors.ts";

/** Activity new labels are parked under by the DN sync, pending admin review. */
export { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";

/** An activity of the Pitchou referentiel, as received from `/api/activites`. */
export type ActiviteAdmin = {
  code: string;
  label: string;
  groupe_code: string;
};

/** A thematic group of activities, with its display color. */
export type ActiviteGroupeAdmin = {
  code: string;
  label: string;
  color: string;
};

/** A raw « Activité principale » label and the activity it is grouped under. */
export type ActiviteLabelAdmin = {
  label: string;
  activite_code: string;
  needs_review: boolean;
  created_at: string;
};

export type ActiviteReferentielAdmin = {
  groupes: ActiviteGroupeAdmin[];
  activites: ActiviteAdmin[];
  labels: ActiviteLabelAdmin[];
};

async function checkResponse(response: Response, action: string): Promise<void> {
  if (response.ok) return;
  if (response.status === 403) throw new AccessDeniedError();
  const message = await response.text();
  throw new Error(
    `Erreur ${response.status} lors de ${action} : ${message || response.statusText}`,
  );
}

async function fetchActiviteReferentiel(): Promise<ActiviteReferentielAdmin> {
  const response = await fetch(`/api/activites`);
  await checkResponse(response, "du chargement du référentiel des activités");

  const referentiel = await response.json();
  if (
    !Array.isArray(referentiel?.groupes) ||
    !Array.isArray(referentiel?.activites) ||
    !Array.isArray(referentiel?.labels)
  ) {
    throw new Error("Réponse invalide reçue du serveur pour /api/activites.");
  }
  return referentiel;
}

let referentielPromise: Promise<ActiviteReferentielAdmin> | null = null;

function invalidateActiviteReferentiel(): void {
  referentielPromise = null;
}

/**
 * Loads the whole activity referentiel (activities + grouped labels). Cached across pages — the
 * referentiel only changes through the mutations below, which invalidate the cache.
 */
export function loadActiviteReferentiel(): Promise<ActiviteReferentielAdmin> {
  referentielPromise ??= fetchActiviteReferentiel().catch((error) => {
    invalidateActiviteReferentiel();
    throw error;
  });
  return referentielPromise;
}

/** Reloads the referentiel from the server, e.g. to pick up labels a DN sync just registered. */
export function reloadActiviteReferentiel(): Promise<ActiviteReferentielAdmin> {
  invalidateActiviteReferentiel();
  return loadActiviteReferentiel();
}

/** Creates an activity from its display name and group; the server derives the code. */
export async function createActivite(label: string, groupeCode: string): Promise<void> {
  const response = await fetch(`/api/activites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, groupeCode }),
  });
  await checkResponse(response, "de la création de l'activité");
  invalidateActiviteReferentiel();
}

export async function renameActivite(code: string, label: string): Promise<void> {
  const response = await fetch(`/api/activites/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  await checkResponse(response, "du renommage de l'activité");
  invalidateActiviteReferentiel();
}

export async function renameActiviteGroupe(code: string, label: string): Promise<void> {
  const response = await fetch(`/api/activites/groupes/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  await checkResponse(response, "du renommage du groupe d'activités");
  invalidateActiviteReferentiel();
}

/** Moves an activity under another thematic group. */
export async function moveActiviteToGroupe(code: string, groupeCode: string): Promise<void> {
  const response = await fetch(`/api/activites/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupeCode }),
  });
  await checkResponse(response, "du changement de groupe de l'activité");
  invalidateActiviteReferentiel();
}

/**
 * Groups a label under an activity and marks it as reviewed. Accepting a flagged label as
 * « Autre » is the same call with its current activity code.
 */
export async function reassignActiviteLabel(label: string, activiteCode: string): Promise<void> {
  const response = await fetch(`/api/activites/labels`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, activiteCode }),
  });
  await checkResponse(response, "du rattachement du libellé");
  invalidateActiviteReferentiel();
}
