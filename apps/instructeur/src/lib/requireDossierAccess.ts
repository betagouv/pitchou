import { redirect } from "@sveltejs/kit";
import { store } from "$lib/state/store.svelte.ts";

// Call after the parent layout has loaded the session.
export function requireDossierAccess() {
  if (!store.capabilities.listerDossiers) {
    redirect(307, store.identité ? "/auth/acces-refuse" : "/connexion");
  }
}
