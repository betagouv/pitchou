import { redirect } from "@sveltejs/kit";
import { store } from "#lib/state/store.svelte.ts";
import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ parent }) => {
  await parent();
  if (!store.capabilities.getEmailNotificationPreferences) redirect(307, "/auth/login");
  return {};
};
