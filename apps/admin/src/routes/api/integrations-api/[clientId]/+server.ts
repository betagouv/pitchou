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
    const integration = apiIntegration(params.clientId, trx);
    const updated = await integration.clone().whereNot({ enabled }).update({ enabled });
    if (updated) {
      await audit(trx, actor.id, "api.integration.updated", { clientId: params.clientId, enabled });
    } else if (!(await integration.first("client_id"))) {
      error(404, "Service introuvable.");
    }
    return new Response(null, { status: 204 });
  });
};
