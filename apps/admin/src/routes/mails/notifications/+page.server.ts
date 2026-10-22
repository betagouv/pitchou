import { error } from "@sveltejs/kit";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import {
  notificationFilters,
  notificationOverview,
} from "@pitchou/server/database/notification_monitoring.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  if (!locals.user) error(401, "Authentification requise");
  if (!isAdminEmail(locals.user.email)) error(403, "Accès refusé");
  let filters;
  try {
    filters = notificationFilters(url.searchParams);
  } catch (caught) {
    error(400, caught instanceof Error ? caught.message : "Filtres invalides");
  }
  return { filters, overview: await notificationOverview(filters) };
};
