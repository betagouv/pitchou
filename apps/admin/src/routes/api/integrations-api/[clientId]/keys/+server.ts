import { error, json } from "@sveltejs/kit";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { audit } from "@pitchou/server/administration/audit.ts";
import { apiIntegration } from "@pitchou/server/database/externalApi/integrations.ts";
import { createApiKey, revokeApiKey } from "@pitchou/server/database/externalApi/keys.ts";
import {
  dossierInternalScope,
  dossierReadScope,
  serviceScopes,
} from "@pitchou/types/externalApi.ts";
import {
  apiKeyId,
  apiKeyResponseHeaders,
  parseApiKeyInput,
} from "@pitchou/server-utils/apiKeys.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const input = parseApiKeyInput(await readJsonObject(request), serviceScopes);
  if (input.scopes.includes(dossierInternalScope) && !input.scopes.includes(dossierReadScope)) {
    error(400, "La lecture interne exige aussi la permission de consulter les dossiers.");
  }
  const clientId = params.clientId;
  return withAdminWriteAccess(locals, "admin:api:manage", async (trx, actor) => {
    if (!(await apiIntegration(clientId, trx).first("client_id")))
      error(404, "Service introuvable.");
    const issued = await createApiKey({ client_id: clientId }, input, trx);
    await audit(trx, actor.id, "api.key.created", { clientId, keyId: issued.key.id });
    return json(issued, { status: 201, headers: apiKeyResponseHeaders });
  });
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
  const { id } = await readJsonObject(request);
  const keyId = apiKeyId(id);
  const clientId = params.clientId;
  return withAdminWriteAccess(locals, "admin:api:manage", async (trx, actor) => {
    if (!(await revokeApiKey({ client_id: clientId }, keyId, trx)))
      error(404, "Clé introuvable ou déjà révoquée.");
    await audit(trx, actor.id, "api.key.revoked", { clientId, keyId });
    return new Response(null, { status: 204 });
  });
};
