import { error } from "@sveltejs/kit";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import { emailFilters, emailOverview } from "@pitchou/server/database/email_monitoring.ts";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) error(401, "Authentification requise");
  if (!isAdminEmail(locals.user.email)) error(403, "Accès réservé aux administrateurs");
  let filters;
  try {
    filters = emailFilters(url.searchParams);
  } catch (cause) {
    error(400, cause instanceof Error ? cause.message : "Filtres invalides");
  }
  return { filters, overview: await emailOverview(filters) };
};
