import { fetchAuthenticated } from "../helpers/auth.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

export function mutate(cap: string, dossierId: number, body: unknown, method = "DELETE") {
  return fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossier/${dossierId}/commentaires`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
