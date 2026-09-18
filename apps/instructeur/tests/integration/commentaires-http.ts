import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

export function mutate(cap: string, dossierId: number, body: unknown, method = "DELETE") {
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}/commentaires?cap=${cap}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
