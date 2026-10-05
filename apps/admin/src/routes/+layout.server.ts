import { getMaxUploadSizeBytes } from "@pitchou/server/upload.ts";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  return {
    user: locals.user,
    isAdmin: locals.user?.permissions.includes("admin:access") ?? false,
    maxUploadSizeBytes: getMaxUploadSizeBytes(),
  };
};
