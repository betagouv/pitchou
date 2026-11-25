import type { Knex } from "knex";

const scopes = [
  ["dossiers:read:interne", "dossiers:read:internal"],
  ["compte:read", "account:read"],
  ["referentiels:read", "references:read"],
] as const;

async function renameScope(db: Knex, from: string, to: string) {
  await db.raw(
    "UPDATE external_api_key SET scopes = array_replace(scopes, ?, ?) WHERE ? = ANY(scopes)",
    [from, to, from],
  );
}

async function renameInternalGrants(db: Knex, from: string, to: string) {
  for (const [table, target] of [
    ["external_api_dossier_grant", "dossier"],
    ["external_api_groupe_grant", "groupe_instructeurs"],
  ]) {
    await db.raw(
      `WITH moved AS (DELETE FROM ?? WHERE scope = ? RETURNING client_id, ??)
       INSERT INTO ?? (client_id, scope, ??)
       SELECT client_id, ?, ?? FROM moved
       ON CONFLICT DO NOTHING`,
      [table, from, target, table, target, to, target],
    );
  }
}

export async function up(db: Knex) {
  for (const [from, to] of scopes) await renameScope(db, from, to);
  await renameInternalGrants(db, ...scopes[0]);
}

export async function down(db: Knex) {
  for (const [from, to] of scopes) await renameScope(db, to, from);
  await renameInternalGrants(db, scopes[0][1], scopes[0][0]);
}
