import { getMaxUploadSizeBytes } from "@pitchou/server/upload.ts";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, cookies }) => {
  return {
    user: locals.user,
    isAdmin: locals.user?.permissions.includes("admin:access") ?? false,
    maxUploadSizeBytes: getMaxUploadSizeBytes(),
    sidebarCollapsed: cookies.get("pitchou-admin-sidebar") === "collapsed",
  };
};
