import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { store } from "$lib/state/store.svelte.ts";
import { sendEvenement } from "$lib/shared/aarri.ts";

import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export function instructeurFollowsDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  console.log("instructeurFollowsDossier", dossierId);

  const updateFollowRelation = store.capabilities.updateFollowRelation;

  if (!updateFollowRelation) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  const relationsSuivi = store.followRelations || new SvelteMap();
  const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
  dossiersSuivisParInstructeur.add(dossierId);
  relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
  store.followRelations = relationsSuivi;

  sendEvenement({ type: "suivreUnDossier", détails: { dossierId } });

  return updateFollowRelation("suivre", instructeurEmail, dossierId);
}

export function instructeurLeavesDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  const updateFollowRelation = store.capabilities.updateFollowRelation;

  if (!updateFollowRelation) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  const relationsSuivi = store.followRelations || new SvelteMap();
  const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
  dossiersSuivisParInstructeur.delete(dossierId);
  relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
  store.followRelations = relationsSuivi;

  return updateFollowRelation("laisser", instructeurEmail, dossierId);
}
