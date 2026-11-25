import { json } from "@sveltejs/kit";
import {
  internalDossierResources,
  listDossierFollowers,
  sharedDossierResources,
} from "@pitchou/server/database/externalApi/related.ts";
import { isResource, withDossierRead } from "#lib/server/externalApi/read.ts";
import { apiNotFound } from "#lib/server/externalApi/responses.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params }) => {
  const resource = params.resource;
  if (
    resource !== "followers" &&
    !isResource(sharedDossierResources, resource) &&
    !isResource(internalDossierResources, resource)
  )
    return apiNotFound();

  return withDossierRead(
    locals,
    params.id,
    async (id, internal, trx, principal) => {
      if (isResource(sharedDossierResources, resource))
        return sharedDossierResources[resource](id, internal, trx);
      if (isResource(internalDossierResources, resource))
        return internal ? internalDossierResources[resource](id, trx) : undefined;
      const userId = principal.kind === "personal" ? principal.userId : null;
      return listDossierFollowers(id, userId, internal, trx);
    },
    json,
  );
};
