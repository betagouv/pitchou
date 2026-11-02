import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, url }) => {
  if (!locals.user) redirect(303, "/auth/login?redirectTo=" + encodeURIComponent(url.pathname));
  return { userId: locals.user.id };
};
