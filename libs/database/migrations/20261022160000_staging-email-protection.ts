import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.raw(`
    ALTER TABLE email_notification_outbox DROP CONSTRAINT email_notification_outbox_status_check;
    ALTER TABLE email_notification_outbox ADD CONSTRAINT email_notification_outbox_status_check
      CHECK (status IN ('pending', 'sent', 'cancelled', 'uncertain', 'suppressed'));
  `);
}

export async function down(db: Knex) {
  await db.raw(`
    UPDATE email_notification_outbox SET status = 'cancelled' WHERE status = 'suppressed';
    ALTER TABLE email_notification_outbox DROP CONSTRAINT email_notification_outbox_status_check;
    ALTER TABLE email_notification_outbox ADD CONSTRAINT email_notification_outbox_status_check
      CHECK (status IN ('pending', 'sent', 'cancelled', 'uncertain'));
  `);
}
