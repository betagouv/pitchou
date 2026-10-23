import { page } from "$app/state";
import type { Permission } from "@pitchou/types/permissions.ts";

export function can(permission: Permission): boolean {
  return page.data.user?.permissions.includes(permission) ?? false;
}
