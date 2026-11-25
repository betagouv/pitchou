import { error } from "@sveltejs/kit";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { audit } from "@pitchou/server/administration/audit.ts";
import {
  apiIntegration,
  changeApiIntegrationGrant,
} from "@pitchou/server/database/externalApi/integrations.ts";
import { apiKeyId, isDossierGrantScope } from "@pitchou/server-utils/apiKeys.ts";
import { retiredStatusScope, type ApiGrantTarget } from "@pitchou/types/externalApi.ts";
import type { RequestHandler } from "./$types";

function parseTarget({ dossierId, groupeId }: Record<string, unknown>): ApiGrantTarget {
  if (groupeId !== undefined && dossierId !== undefined)
    error(400, "Choisissez un dossier ou un groupe.");
  if (groupeId !== undefined) return { groupeId: apiKeyId(groupeId) };
  if (
    typeof dossierId !== "number" ||
    !Number.isInteger(dossierId) ||
    dossierId < 1 ||
    dossierId > 2_147_483_647
  )
    error(400, "Saisissez un numéro de dossier Pitchou valide.");
  return { dossierId };
}

const change: RequestHandler = async ({ locals, params, request }) => {
  const body = await readJsonObject(request);
  const { scope } = body;
  const add = request.method === "POST";
  if (!isDossierGrantScope(scope) && (add || scope !== retiredStatusScope))
    error(400, "Choisissez une permission proposée.");
  const target = parseTarget(body);
  const clientId = params.clientId;
  return withAdminWriteAccess(locals, "admin:api:manage", async (trx, actor) => {
    if (!(await apiIntegration(clientId, trx).first("client_id")))
      error(404, "Service introuvable.");
    if (add) {
      const resource =
        "dossierId" in target
          ? trx("dossier").where({ id: target.dossierId })
          : trx("groupe_instructeurs").where({ id: target.groupeId, active: true });
      if (!(await resource.forKeyShare().first("id")))
        error(404, "Dossier ou groupe actif introuvable.");
    }
    await changeApiIntegrationGrant(clientId, scope, target, add, trx);
    await audit(trx, actor.id, add ? "api.grant.created" : "api.grant.revoked", {
      clientId,
      scope,
      ...target,
    });
    return new Response(null, { status: 204 });
  });
};

export const POST = change;
export const DELETE = change;
