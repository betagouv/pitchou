import { isAdminEmail } from "@pitchou/server/admin.ts";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  return { user: locals.user, isAdmin: isAdminEmail(locals.user?.email) };
};
