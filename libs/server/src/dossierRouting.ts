import type { Knex } from "knex";
import { reconcileArrivalNotifications } from "./dossierNotificationEmails/arrivals.ts";
import { cancelIneligibleNotifications } from "./dossierNotificationEmails/cancellation.ts";
import { dossierAccessSql } from "./dossierRouting/access.ts";
import { groupAccessSql, ruleMatchesSql } from "./dossierRouting/sql.ts";

export async function lockDossierAccess(trx: Knex.Transaction) {
  await trx.raw("select pg_advisory_xact_lock(2105102026)");
}

export async function changeAssignments<T>(
  db: Knex | Knex.Transaction,
  change: (trx: Knex.Transaction) => PromiseLike<T>,
  options: { dossiers?: number[]; silent?: boolean } = {},
): Promise<T> {
  if (!db.isTransaction) return db.transaction((trx) => changeAssignments(trx, change, options));
  const trx = db as Knex.Transaction;
  await lockDossierAccess(trx);
  const result = await change(trx);
  await recalculateAssignments(trx, options);
  return result;
}

export async function changeDossierAccess<T>(
  db: Knex | Knex.Transaction,
  change: (trx: Knex.Transaction) => PromiseLike<T>,
): Promise<T> {
  if (!db.isTransaction) return db.transaction((trx) => changeDossierAccess(trx, change));
  const trx = db as Knex.Transaction;
  await lockDossierAccess(trx);
  const result = await change(trx);
  await reconcileDossierAccess(trx);
  return result;
}

export async function reconcileDossierAccess(
  trx: Knex.Transaction,
  scope: { dossiers?: number[]; users?: number[] } = {},
) {
  await lockDossierAccess(trx);
  await trx("edge_personne_follows_dossier as f")
    .modify((query) => {
      if (scope.dossiers) query.whereIn("f.dossier", scope.dossiers);
      if (scope.users) query.whereIn("f.personne", scope.users);
    })
    .whereRaw(`${dossierAccessSql("f.dossier", "f.personne")} IS NULL`)
    .delete();
  await cancelIneligibleNotifications(trx, scope);
}

// Call once after all changes in an operation, before committing its transaction.
// An omitted dossier scope is intentional for rule/activity changes affecting any dossier.
export async function recalculateAssignments(
  trx: Knex.Transaction,
  options: { dossiers?: number[]; silent?: boolean } = {},
) {
  await lockDossierAccess(trx);
  if (options.dossiers?.length === 0) return;
  const { rows } = await trx.raw(
    `WITH desired AS MATERIALIZED (
      SELECT d.id AS dossier, candidates.groupe_instructeurs,
        ${groupAccessSql("d", "candidates.groupe_instructeurs")} AS access_level
      FROM dossier d JOIN LATERAL (
        SELECT c.groupe_instructeurs FROM groupe_departement c WHERE c.department = d.primary_department
        UNION SELECT r.groupe_instructeurs FROM group_routing_rule r WHERE ${ruleMatchesSql()}
        UNION SELECT o.groupe_instructeurs FROM dossier_group_override o
          WHERE o.dossier = d.id AND o.mode = 'include'
      ) candidates ON true WHERE (?::integer[] IS NULL OR d.id = ANY(?::integer[]))
    ), removed AS (
      DELETE FROM edge_groupe_instructeurs__dossier e
      WHERE (?::integer[] IS NULL OR e.dossier = ANY(?::integer[]))
        AND NOT EXISTS (SELECT 1 FROM desired x WHERE x.dossier = e.dossier
          AND x.groupe_instructeurs = e.groupe_instructeurs AND x.access_level IS NOT NULL)
      RETURNING dossier
    ), changed AS (
      INSERT INTO edge_groupe_instructeurs__dossier (dossier, groupe_instructeurs, access_level)
      SELECT dossier, groupe_instructeurs, access_level FROM desired WHERE access_level IS NOT NULL
      ON CONFLICT (dossier, groupe_instructeurs) DO UPDATE SET access_level = EXCLUDED.access_level
        WHERE edge_groupe_instructeurs__dossier.access_level IS DISTINCT FROM EXCLUDED.access_level
      RETURNING dossier
    ) SELECT dossier FROM removed UNION SELECT dossier FROM changed`,
    Array.from({ length: 4 }, () => options.dossiers ?? null),
  );
  const dossiers = rows.map((row: { dossier: number }) => row.dossier);
  await reconcileArrivalNotifications(trx, dossiers, options.silent ?? false);
  await reconcileDossierAccess(trx, options.dossiers ? { dossiers: options.dossiers } : {});
}
