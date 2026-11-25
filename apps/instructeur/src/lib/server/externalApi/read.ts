import type { Knex } from "knex";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import type { ExternalApiPrincipal } from "@pitchou/server/database/externalApi.ts";
import { withExternalDossier } from "@pitchou/server/database/externalApi/access.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { dossierReadScope, type ApiScope } from "@pitchou/types/externalApi.ts";
import { apiNotFound, apiProblem, apiUnavailable } from "./responses.ts";

export async function withApiScope(
  { externalApi }: App.Locals,
  scope: ApiScope,
  read: (principal: ExternalApiPrincipal) => Promise<Response>,
) {
  if (!externalApi)
    return apiProblem(401, "Authentification requise", { "WWW-Authenticate": "Bearer" });
  if (!externalApi.scopes.has(scope)) {
    return apiProblem(403, "Portée du jeton insuffisante", {
      "WWW-Authenticate": `Bearer error="insufficient_scope", scope="${scope}"`,
    });
  }
  try {
    return await read(externalApi);
  } catch {
    return apiUnavailable();
  }
}

export function parseDossierId(id: string): DossierId | undefined {
  const value = Number(id);
  return /^[1-9]\d{0,9}$/u.test(id) && value <= 2_147_483_647 ? (value as DossierId) : undefined;
}

export function withDossierRead(
  locals: App.Locals,
  id: string,
  read: (
    dossierId: DossierId,
    internal: boolean,
    trx: Knex.Transaction,
    principal: ExternalApiPrincipal,
    access: DossierAccess,
  ) => Promise<Response>,
) {
  return withApiScope(locals, dossierReadScope, async (principal) => {
    const dossierId = parseDossierId(id);
    if (!dossierId) return apiProblem(400, "Identifiant de dossier invalide");
    const response = await withExternalDossier(
      principal,
      dossierId,
      (access, trx) => read(dossierId, access !== "lecture", trx, principal, access),
      directDatabaseConnection,
    );
    return response ?? apiNotFound();
  });
}

export function isResource<T extends object>(
  resources: T,
  value: string,
): value is keyof T & string {
  return Object.hasOwn(resources, value);
}
