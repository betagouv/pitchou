import { accountResources, withAccountRead } from "#lib/server/externalApi/account.ts";
import { isResource } from "#lib/server/externalApi/read.ts";
import { apiNotFound } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params }) =>
  isResource(accountResources, params.resource)
    ? withAccountRead(locals, accountResources[params.resource])
    : apiNotFound();
