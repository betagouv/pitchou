import { expect } from "vitest";
import type { DossierNotification } from "@pitchou/types/notification.ts";
import { db } from "../setup/db.ts";
import { attachCapToGroupe, createCapDossier, createPersonne } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

export async function createGroupeMember(
  groupeId: string,
  email: string,
  identity: { first_names?: string; last_name?: string } = {},
) {
  const personne = await createPersonne(db, { email, ...identity });
  const { cap } = await createCapDossier(db, personne.codeAcces);
  await attachCapToGroupe(db, cap, groupeId);
  return { ...personne, cap };
}

export function listCandidates(cap: string, dossierId: number) {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}/followers?cap=${cap}`);
}

export function updateFollowers(cap: string, dossierId: number, personneEmails: string[]) {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}/followers?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personneEmails }),
  });
}

export async function notificationFor(
  cap: string,
  dossierId: number,
): Promise<DossierNotification> {
  const response = await fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${cap}`);
  expect(response.status).toBe(200);
  const notifications: DossierNotification[] = await response.json();
  return notifications.find(({ dossier }) => dossier === dossierId)!;
}
