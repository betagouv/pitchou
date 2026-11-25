import { error } from "@sveltejs/kit";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { audit } from "@pitchou/server/administration/audit.ts";
import { apiIntegration } from "@pitchou/server/database/externalApi/integrations.ts";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const { enabled } = await readJsonObject(request);
  if (typeof enabled !== "boolean") error(400, "Choisissez l’état du service.");
  return withAdminWriteAccess(locals, "admin:api:manage", async (trx, actor) => {
    const updated = await apiIntegration(params.clientId, trx).update({ enabled });
    if (!updated) error(404, "Service introuvable.");
    await audit(trx, actor.id, "api.integration.updated", { clientId: params.clientId, enabled });
    return new Response(null, { status: 204 });
  });
};
