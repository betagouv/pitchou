import { redirect } from "@sveltejs/kit";
import { store } from "#lib/state/store.svelte.ts";
import type { LayoutLoad } from "./$types.js";

export const load: LayoutLoad = async ({ parent }) => {
  await parent();
  if (!store.capabilities.getEmailNotificationPreferences) redirect(307, "/connexion");
  return {};
};
