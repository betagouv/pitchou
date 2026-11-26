import { json } from "@sveltejs/kit";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { audit } from "@pitchou/server/administration/audit.ts";
import { createApiIntegration } from "@pitchou/server/database/externalApi/integrations.ts";
import { apiKeyLabel } from "@pitchou/server-utils/apiKeys.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request }) => {
  const name = apiKeyLabel((await readJsonObject(request)).name);
  return withAdminWriteAccess(locals, "admin:api:manage", async (trx, actor) => {
    const clientId = await createApiIntegration(name, trx);
    await audit(trx, actor.id, "api.integration.created", { clientId });
    return json({ id: clientId }, { status: 201 });
  });
};
