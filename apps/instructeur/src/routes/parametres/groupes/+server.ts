import { error, json } from "@sveltejs/kit";
import { requireUserId } from "#lib/server/auth.ts";
import { listMembershipGroups, GroupMembershipError } from "@pitchou/server/groupMembership.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  try {
    return json(await listMembershipGroups(requireUserId(locals)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (cause) {
    if (cause instanceof GroupMembershipError) error(cause.status, cause.message);
    throw cause;
  }
};
