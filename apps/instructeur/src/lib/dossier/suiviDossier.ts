import { SvelteMap, SvelteSet } from "svelte/reactivity";
import { store } from "$lib/state/store.svelte.ts";
import { envoyerÉvènement } from "$lib/shared/aarri.ts";

import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";

export function instructeurSuitDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  console.log("instructeurSuitDossier", dossierId);

  const modifierRelationSuivi = store.capabilities.modifierRelationSuivi;

  if (!modifierRelationSuivi) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  const relationsSuivi = store.relationSuivis || new SvelteMap();
  const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
  dossiersSuivisParInstructeur.add(dossierId);
  relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
  store.relationSuivis = relationsSuivi;

  envoyerÉvènement({ type: "suivreUnDossier", détails: { dossierId } });

  return modifierRelationSuivi("suivre", instructeurEmail, dossierId);
}

export function instructeurLaisseDossier(
  instructeurEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
) {
  const modifierRelationSuivi = store.capabilities.modifierRelationSuivi;

  if (!modifierRelationSuivi) {
    throw new Error(`Pas les droits suffisants pour modifier une relation de suivi`);
  }

  const relationsSuivi = store.relationSuivis || new SvelteMap();
  const dossiersSuivisParInstructeur = relationsSuivi.get(instructeurEmail) || new SvelteSet();
  dossiersSuivisParInstructeur.delete(dossierId);
  relationsSuivi.set(instructeurEmail, dossiersSuivisParInstructeur);
  store.relationSuivis = relationsSuivi;

  return modifierRelationSuivi("laisser", instructeurEmail, dossierId);
}
