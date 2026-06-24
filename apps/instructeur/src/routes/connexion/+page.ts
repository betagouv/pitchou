import { redirect } from "@sveltejs/kit";
import { store } from "$lib/state/store.svelte.ts";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ parent }) => {
  await parent();
  // Already signed in: skip the sign-in page
  if (store.capabilities.listerDossiers) {
    redirect(307, "/mes-dossiers");
  }
};
