import type { Knex } from "knex";

export async function up(db: Knex) {
  // Drain older migrations' deferred events before removing their policy triggers.
  await db.raw("SELECT set_config('pitchou.notification_baseline', 'true', true)");
  await db.raw("SELECT pg_advisory_xact_lock(2105102026)");
  await db.raw("SET CONSTRAINTS ALL IMMEDIATE");
  const functions = [
    "lock_pitchou_access",
    "clean_pitchou_followers",
    "route_pitchou_dossier",
    "route_pitchou_groupes",
    "queue_pitchou_email_notification",
    "queue_pitchou_groupe_arrival_email",
    "cancel_pitchou_email_notifications",
    "cancel_pitchou_arrival_emails",
    "prepare_pitchou_notification_audit",
    "audit_pitchou_notification",
  ];
  const { rows } = await db.raw(
    `SELECT t.tgname, n.nspname, c.relname
    FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(?::text[]) AND NOT t.tgisinternal`,
    [functions],
  );
  for (const row of rows)
    await db.raw("DROP TRIGGER ?? ON ??.??", [row.tgname, row.nspname, row.relname]);
  for (const name of functions) await db.raw("DROP FUNCTION ??()", [name]);
  for (const signature of [
    "pitchou_notification_cancellation(email_notification_outbox)",
    "next_pitchou_email_delivery(timestamptz)",
    "refresh_pitchou_ownership(integer)",
    "pitchou_can_instruct(integer)",
  ])
    await db.raw(`DROP FUNCTION ${signature}`);

  await db.raw(`
    ALTER TABLE groupe_regle ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    ALTER TABLE groupe_dossier_override ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    ALTER TABLE edge_groupe_instructeurs__dossier ADD COLUMN access_level text NOT NULL DEFAULT 'instruct'
      CHECK (access_level IN ('read', 'instruct'));
    CREATE TABLE dossier_user_access (
      dossier integer NOT NULL REFERENCES dossier(id) ON DELETE CASCADE,
      user_id integer NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
      access_level text NOT NULL DEFAULT 'instruct' CHECK (access_level IN ('read', 'instruct')),
      PRIMARY KEY (dossier, user_id)
    );
    CREATE INDEX ON dossier_user_access (user_id);

  `);
}

export async function down() {
  throw new Error("Restore a pre-migration backup with the matching application version.");
}
