import { randomUUID } from "node:crypto";
import type { Handle } from "@sveltejs/kit/hooks";
import { admitExternalApiRequest } from "@pitchou/server/database/externalApi.ts";
import { verifyExternalApiToken } from "./externalApi/authentication.ts";
import { apiNotFound, apiProblem, apiUnavailable } from "./externalApi/responses.ts";

export function isExternalApiPath(path: string) {
  return path === "/api/v1" || path.startsWith("/api/v1/");
}

function unauthorized(invalid = false) {
  return apiProblem(401, "Authentification requise", {
    "WWW-Authenticate": invalid ? 'Bearer error="invalid_token"' : "Bearer",
  });
}

async function resolveProtectedApi({ event, resolve }: Parameters<Handle>[0]) {
  const authorization = event.request.headers.get("authorization");
  if (!authorization) return unauthorized();
  if (authorization.length > 8192) return unauthorized(true);
  const token = /^Bearer +([\w-]+\.[\w-]+\.[\w-]+)$/iu.exec(authorization)?.[1];
  if (!token) return unauthorized(true);

  const principal = await verifyExternalApiToken(token);
  if (!principal) return unauthorized(true);
  event.locals.externalApi = principal;

  const admission = await admitExternalApiRequest(principal.clientId);
  if (admission === "disabled") return unauthorized(true);
  if (admission === "limited") return apiProblem(429, "Trop de requêtes", { "Retry-After": "60" });
  if (!isExternalApiPath(event.route.id ?? "")) return apiNotFound();

  const response = await resolve(event);
  if (response.status === 405) {
    return apiProblem(405, "Méthode non autorisée", { Allow: response.headers.get("Allow") ?? "" });
  }
  return response;
}

export const handleExternalApi: Handle = async (input) => {
  const { event, resolve } = input;
  event.locals.user = null;
  if (event.route.id === "/api/v1/docs" || event.route.id === "/api/v1/openapi.json") {
    return resolve(event);
  }

  const requestId = randomUUID();
  const startedAt = Date.now();
  const response = await resolveProtectedApi(input).catch(apiUnavailable);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Request-Id", requestId);
  console.info(
    JSON.stringify({
      event: "external_api_request",
      requestId,
      clientId: event.locals.externalApi?.clientId,
      method: event.request.method,
      route: event.route.id,
      status: response.status,
      durationMs: Date.now() - startedAt,
    }),
  );
  return new Response(event.request.method === "HEAD" ? null : response.body, {
    status: response.status,
    headers,
  });
};
