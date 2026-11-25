import type { UserId } from "@pitchou/types/permissions.ts";
import { directDatabaseConnection } from "./connection.ts";
import { externalApiRequestsPerMinute } from "./externalApi/keys.ts";

export { externalApiRequestsPerMinute };
export type ExternalApiIdentity =
  | { kind: "personal"; userId: UserId; keyId: string }
  | { kind: "service"; clientId: string; keyId?: string };
export type ExternalApiPrincipal = ExternalApiIdentity & { scopes: ReadonlySet<string> };
type Admission = "admitted" | "disabled" | "limited";

export async function admitExternalApiRequest(
  clientId: string,
  db = directDatabaseConnection,
  requireOAuth = false,
) {
  // PostgreSQL serializes concurrent requests for the same client across app instances.
  const { rows } = await db
    .raw<{ rows: [{ admission: Admission }] }>(
      `WITH clock AS (SELECT date_trunc('minute', statement_timestamp()) AS window_start),
    admitted AS (
      UPDATE external_api_client
      SET rate_window_start = clock.window_start,
          requests_this_minute = CASE WHEN rate_window_start = clock.window_start
            THEN requests_this_minute + 1 ELSE 1 END
      FROM clock
      WHERE client_id = :clientId AND enabled AND (NOT :requireOAuth OR allow_oauth) AND (
        rate_window_start IS NULL OR rate_window_start < clock.window_start OR
        (rate_window_start = clock.window_start AND requests_this_minute < :limit)
      )
      RETURNING client_id
    )
    SELECT CASE WHEN EXISTS (SELECT 1 FROM admitted) THEN 'admitted'
      WHEN EXISTS (SELECT 1 FROM external_api_client WHERE client_id = :clientId AND enabled
        AND (NOT :requireOAuth OR allow_oauth))
        THEN 'limited'
      ELSE 'disabled' END AS admission`,
      { clientId, limit: externalApiRequestsPerMinute, requireOAuth },
    )
    .timeout(3000, { cancel: true });
  return rows[0].admission;
}
