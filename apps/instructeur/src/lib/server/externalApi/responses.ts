export const dossierStatusScope = "dossiers:read:statut";

export function apiProblem(status: number, title: string, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/problem+json");
  return new Response(JSON.stringify({ type: "about:blank", title, status }), {
    status,
    headers: responseHeaders,
  });
}

export function apiNotFound() {
  return apiProblem(404, "Ressource introuvable");
}

export function apiUnavailable() {
  return apiProblem(503, "Service temporairement indisponible");
}
