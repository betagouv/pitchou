import { referenceResources, withReferenceRead } from "#lib/server/externalApi/references.ts";
import { isResource } from "#lib/server/externalApi/read.ts";
import { apiNotFound } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params, url }) => {
  const resource = params.resource;
  return isResource(referenceResources, resource)
    ? withReferenceRead(locals, () => referenceResources[resource](url.searchParams))
    : apiNotFound();
};
