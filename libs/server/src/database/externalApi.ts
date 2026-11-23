import type { Knex } from "knex";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import { directDatabaseConnection } from "./connection.ts";
import { orderPhaseEvents } from "./phaseHistory.ts";

export const externalApiRequestsPerMinute = 60;
type Admission = "admitted" | "disabled" | "limited";

export async function admitExternalApiRequest(clientId: string, db = directDatabaseConnection) {
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
      WHERE client_id = :clientId AND enabled AND (
        rate_window_start IS NULL OR rate_window_start < clock.window_start OR
        (rate_window_start = clock.window_start AND requests_this_minute < :limit)
      )
      RETURNING client_id
    )
    SELECT CASE WHEN EXISTS (SELECT 1 FROM admitted) THEN 'admitted'
      WHEN EXISTS (SELECT 1 FROM external_api_client WHERE client_id = :clientId AND enabled)
        THEN 'limited'
      ELSE 'disabled' END AS admission`,
      { clientId, limit: externalApiRequestsPerMinute },
    )
    .timeout(3000, { cancel: true });
  return rows[0].admission;
}

type DossierStatusRow = { id: number; phase: DossierPhase | null; timestamp: Date | null };

export async function readExternalDossierStatus(
  clientId: string,
  scope: string,
  dossierId: number,
  db: Knex = directDatabaseConnection,
): Promise<DossierStatusRow | undefined> {
  const latestPhase = db("evenement_phase_dossier")
    .select("phase", "timestamp")
    .where("evenement_phase_dossier.dossier", db.ref("dossier.id"))
    .modify(orderPhaseEvents)
    .limit(1)
    .toSQL();
  const dossierGrant = db("external_api_dossier_grant as grant")
    .select(db.raw("1"))
    .where({ "grant.client_id": clientId, "grant.scope": scope })
    .where("grant.dossier", db.ref("dossier.id"));
  const groupeGrant = db("external_api_groupe_grant as grant")
    .join("groupe_instructeurs as groupe", "groupe.id", "grant.groupe_instructeurs")
    .join(
      "edge_groupe_instructeurs__dossier as assignment",
      "assignment.groupe_instructeurs",
      "groupe.id",
    )
    .select(db.raw("1"))
    .where({ "grant.client_id": clientId, "grant.scope": scope, "groupe.active": true })
    .where("assignment.dossier", db.ref("dossier.id"));

  return db("dossier")
    .first<DossierStatusRow>("dossier.id", "latest_phase.phase", "latest_phase.timestamp")
    .joinRaw(`LEFT JOIN LATERAL (${latestPhase.sql}) AS latest_phase ON true`, [
      ...latestPhase.bindings,
    ])
    .where("dossier.id", dossierId)
    .whereExists(
      db("external_api_client").select("client_id").where({ client_id: clientId, enabled: true }),
    )
    .where((grants) => grants.whereExists(dossierGrant).orWhereExists(groupeGrant))
    .timeout(3000, { cancel: true });
}
