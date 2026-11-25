import { error, json } from "@sveltejs/kit";
import { requireUserId } from "#lib/server/auth.ts";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import {
  apiKeyId,
  apiKeyResponseHeaders,
  parseApiKeyInput,
} from "@pitchou/server-utils/apiKeys.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { permissionQuery } from "@pitchou/server/database/dossier/access.ts";
import { createApiKey, revokeApiKey } from "@pitchou/server/database/externalApi/keys.ts";
import { lockDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { personalAccountScopes, personalDossierScopes } from "@pitchou/types/externalApi.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const body = await readJsonObject(request);
  const issued = await directDatabaseConnection.transaction(async (trx) => {
    await lockDossierAccess(trx);
    const user = await trx("auth_user")
      .where({ id: userId, active: true })
      .whereNotNull("email")
      .first("id");
    if (!user) error(403, "Compte inaccessible.");
    const canReadDossiers = await permissionQuery(userId, "dossier:read", trx).first();
    const input = parseApiKeyInput(body, [...personalDossierScopes, ...personalAccountScopes]);
    if (
      !canReadDossiers &&
      input.scopes.some((scope) =>
        personalDossierScopes.some((dossierScope) => dossierScope === scope),
      )
    ) {
      error(403, "Vous devez avoir la permission de consulter les dossiers.");
    }
    return createApiKey({ user_id: userId }, input, trx);
  });
  return json(issued, { status: 201, headers: apiKeyResponseHeaders });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const { id } = await readJsonObject(request);
  const revoked = await revokeApiKey({ user_id: userId }, apiKeyId(id));
  if (!revoked) error(404, "Clé introuvable ou déjà révoquée.");
  return new Response(null, { status: 204 });
};
