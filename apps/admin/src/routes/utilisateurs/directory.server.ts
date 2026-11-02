import { listUsers, listUserGroupOptions } from "@pitchou/server/administration.ts";
export async function loadUserDirectory(permissions: string[]) {
  const [users, groups] = await Promise.all([
    listUsers(),
    permissions.includes("groups:manage") ? listUserGroupOptions() : null,
  ]);
  return { users, groups };
}
