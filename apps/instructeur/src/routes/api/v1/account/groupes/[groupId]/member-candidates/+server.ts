import { GroupMembershipError } from "@pitchou/server/groupMembership.ts";
import { searchGroupMemberCandidates } from "@pitchou/server/groupMembership/search.ts";
import { withAccountRead } from "#lib/server/externalApi/account.ts";
import { apiProblem } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params, url }) =>
  withAccountRead(locals, async (userId, trx) => {
    const search = url.searchParams.get("q") ?? "";
    if (search.length > 254) return apiProblem(400, "Recherche trop longue");
    try {
      return await searchGroupMemberCandidates(userId, params.groupId, search, trx);
    } catch (cause) {
      if (cause instanceof GroupMembershipError) return apiProblem(cause.status, cause.message);
      throw cause;
    }
  });
