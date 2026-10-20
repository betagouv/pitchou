import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

export function mutate(
  cap: string,
  dossierId: number,
  body: unknown,
  method: "DELETE" | "PUT" = "DELETE",
) {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}/commentaires?cap=${cap}`, options);
}
