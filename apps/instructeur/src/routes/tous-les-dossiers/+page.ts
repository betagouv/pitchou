import { redirect } from "@sveltejs/kit";
import { store } from "$lib/state/store.svelte.ts";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ parent }) => {
  await parent();
  // Require a signed-in instructeur able to list dossiers
  if (!store.capabilities.listerDossiers) {
    redirect(307, "/connexion");
  }
};
