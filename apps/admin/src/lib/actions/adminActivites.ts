import { AccessDeniedError } from "./errors.ts";

/** Activity new labels are parked under by the DN sync, pending admin review. */
export const AUTRE_ACTIVITE_CODE = "autre";

/** An activity of the Pitchou referentiel, as received from `/api/activites`. */
export type ActiviteAdmin = {
  code: string;
  label: string;
};

/** A raw « Activité principale » label and the activity it is grouped under. */
export type ActiviteLabelAdmin = {
  label: string;
  activite_code: string;
  needs_review: boolean;
  created_at: string;
};

export type ActiviteReferentielAdmin = {
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

/** Loads the whole activity referentiel (activities + grouped labels). */
export async function loadActiviteReferentiel(): Promise<ActiviteReferentielAdmin> {
  const response = await fetch(`/api/activites`);
  await checkResponse(response, "du chargement du référentiel des activités");

  const referentiel = await response.json();
  if (!Array.isArray(referentiel?.activites) || !Array.isArray(referentiel?.labels)) {
    throw new Error("Réponse invalide reçue du serveur pour /api/activites.");
  }
  return referentiel;
}

/** Creates an activity from its display name; the server derives the code. */
export async function createActivite(label: string): Promise<void> {
  const response = await fetch(`/api/activites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  await checkResponse(response, "de la création de l'activité");
}

export async function renameActivite(code: string, label: string): Promise<void> {
  const response = await fetch(`/api/activites/${encodeURIComponent(code)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  await checkResponse(response, "du renommage de l'activité");
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
}
