import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { store } from "$lib/state/store.svelte.ts";
import { loadNotificationByDossierForCurrentInstructeur } from "$lib/shared/main.ts";

import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

const pendingUpdates = new Map<Dossier["id"], Promise<void>>();

export function queueDossierFollowUpdate(
  dossierId: Dossier["id"],
  update: () => Promise<void>,
): Promise<void> {
  const previousUpdate = pendingUpdates.get(dossierId) ?? Promise.resolve();
  const queuedUpdate = previousUpdate.then(update, update);
  pendingUpdates.set(dossierId, queuedUpdate);

  return queuedUpdate.finally(() => {
    if (pendingUpdates.get(dossierId) === queuedUpdate) pendingUpdates.delete(dossierId);
  });
}

export function instructeurFollowsDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  console.log("instructeurFollowsDossier", dossierId);

  const updateFollowRelation = store.capabilities.updateFollowRelation;

  if (!updateFollowRelation) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  return queueDossierFollowUpdate(dossierId, async () => {
    const relationsSuivi = store.followRelations || new SvelteMap();
    const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
    const alreadyFollowed = dossiersSuivisParInstructeur.has(dossierId);
    dossiersSuivisParInstructeur.add(dossierId);
    relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
    store.followRelations = relationsSuivi;

    try {
      await updateFollowRelation("suivre", instructeurEmail, dossierId);
    } catch (error) {
      if (!alreadyFollowed) dossiersSuivisParInstructeur.delete(dossierId);
      throw error;
    }

    // The metric event is recorded server-side, with the historique entry.
    try {
      await loadNotificationByDossierForCurrentInstructeur();
    } catch (error) {
      console.warn("Failed to reload dossier notifications", error);
    }
  });
}

export function instructeurLeavesDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  const updateFollowRelation = store.capabilities.updateFollowRelation;

  if (!updateFollowRelation) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  return queueDossierFollowUpdate(dossierId, async () => {
    const relationsSuivi = store.followRelations || new SvelteMap();
    const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
    const alreadyFollowed = dossiersSuivisParInstructeur.has(dossierId);
    dossiersSuivisParInstructeur.delete(dossierId);
    relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
    store.followRelations = relationsSuivi;

    try {
      await updateFollowRelation("laisser", instructeurEmail, dossierId);
    } catch (error) {
      if (alreadyFollowed) dossiersSuivisParInstructeur.add(dossierId);
      throw error;
    }

    try {
      await loadNotificationByDossierForCurrentInstructeur();
    } catch (error) {
      console.warn("Failed to reload dossier notifications", error);
    }
  });
}
