import { json } from "@sveltejs/kit";
import {
  internalDossierResources,
  listDossierFollowers,
  sharedDossierResources,
} from "@pitchou/server/database/externalApi/related.ts";
import { isResource, withDossierRead } from "#lib/server/externalApi/read.ts";
import { apiNotFound } from "#lib/server/externalApi/responses.ts";
import { listDossierFollowerCandidates } from "@pitchou/server/database/relation_suivi.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals, params }) => {
  const resource = params.resource;
  if (
    resource !== "followers" &&
    resource !== "follower-candidates" &&
    !isResource(sharedDossierResources, resource) &&
    !isResource(internalDossierResources, resource)
  )
    return apiNotFound();

  return withDossierRead(
    locals,
    params.id,
    async (id, internal, trx, principal, access) => {
      if (resource === "follower-candidates") {
        if (principal.kind !== "personal" || access !== "complet") return;
        const candidates = await listDossierFollowerCandidates(principal.userId, id, trx);
        return candidates?.map(({ email, firstNames, lastName, followsDossier }) => ({
          email,
          first_names: firstNames,
          last_name: lastName,
          followed: followsDossier,
        }));
      }
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
