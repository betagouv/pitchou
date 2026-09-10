import type { Knex } from "knex";

export async function up(knex: Knex) {
  // No backfill: dossiers and follows already present are not new arrivals.
  await knex.schema.createTable("notification_arrival", (table) => {
    table.integer("dossier").primary().references("id").inTable("dossier").onDelete("CASCADE");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable("notification", (table) => {
    table.boolean("arrival_viewed").notNullable().defaultTo(false);
    table.uuid("follow_revision").nullable();
    table.timestamp("follow_at", { useTz: true }).nullable();
    table.boolean("receive_legacy_changes").notNullable().defaultTo(false);
  });
  await knex.schema.createTable("notification_review", (table) => {
    table
      .uuid("action")
      .notNullable()
      .references("id")
      .inTable("action_dossier")
      .onDelete("CASCADE");
    table
      .integer("personne")
      .notNullable()
      .references("id")
      .inTable("personne")
      .onDelete("CASCADE");
    table.primary(["action", "personne"]);
  });
  await backfillLegacyReviews(knex);
  await knex.raw(`
    ALTER TABLE notification ALTER COLUMN updated_at DROP DEFAULT;
    COMMENT ON COLUMN notification.updated_at IS 'Latest detected applicant change, including acknowledged revisions';
    COMMENT ON COLUMN notification.viewed_at IS 'Last arrival/follow dismissal; historical read boundary used only by the migration';
    COMMENT ON COLUMN notification.receive_legacy_changes IS 'Whether this recipient existed before per-revision review was introduced';
    CREATE FUNCTION notify_pitchou_arrival() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO notification_arrival (dossier) VALUES (NEW.id);
      RETURN NEW;
    END $$;
    CREATE TRIGGER notification_arrival_insert AFTER INSERT ON dossier
      FOR EACH ROW EXECUTE FUNCTION notify_pitchou_arrival();
    CREATE FUNCTION notify_pitchou_follow() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        INSERT INTO notification (dossier, personne, viewed, updated_at, follow_revision, follow_at)
          VALUES (NEW.dossier, NEW.personne, false, NULL, gen_random_uuid(), clock_timestamp())
          ON CONFLICT (dossier, personne) DO UPDATE
            SET follow_revision = EXCLUDED.follow_revision, follow_at = EXCLUDED.follow_at, viewed = false;
        RETURN NEW;
      END IF;
      UPDATE notification SET follow_revision = NULL, follow_at = NULL
        WHERE dossier = OLD.dossier AND personne = OLD.personne;
      RETURN OLD;
    END $$;
    CREATE TRIGGER notification_follow_transition AFTER INSERT OR DELETE ON edge_personne_follows_dossier
      FOR EACH ROW EXECUTE FUNCTION notify_pitchou_follow();
  `);
}

export async function backfillLegacyReviews(knex: Knex) {
  // Scalar diffs are updates. For files, require evidence of a prior read or
  // an earlier import; a batch of initial imports at the same timestamp is not evidence.
  await knex("action_dossier")
    .where({ author_petitionnaire: true, type: "champ_modifie" })
    .whereRaw("data->>'field' IS NOT NULL AND COALESCE(data->>'baseline', 'false') <> 'true'")
    .update({
      data: knex.raw('data || \'{"notification":true,"notification_legacy":true}\'::jsonb'),
    });
  await knex.raw(`
    UPDATE action_dossier AS a
    SET data = a.data || jsonb_build_object(
      'notification', true, 'notification_legacy', true,
      'notification_field', CASE WHEN a.type = 'especes_renseignees' THEN 'especes'
        ELSE 'piece:historique:' || a.id::text END,
      'field', CASE WHEN a.type = 'especes_renseignees' THEN 'Espèces impactées'
        ELSE COALESCE(a.data->>'name', 'Pièce jointe') END,
      'label', CASE WHEN a.type = 'especes_renseignees' THEN 'Espèces impactées'
        ELSE COALESCE(a.data->>'name', 'Pièce jointe') END)
    WHERE a.author_petitionnaire
      AND a.type IN ('especes_renseignees', 'piece_jointe_importee')
      AND COALESCE(a.data->>'baseline', 'false') <> 'true'
      AND (
        EXISTS (SELECT 1 FROM notification n WHERE n.dossier = a.dossier
          AND n.viewed_at < a.created_at)
        OR EXISTS (SELECT 1 FROM action_dossier earlier
          WHERE earlier.dossier = a.dossier AND earlier.type = a.type
            AND earlier.author_petitionnaire AND earlier.created_at < a.created_at)
      )
  `);
  // Only existing recipients inherit the old unread backlog. Following later
  // must not resurrect every historical change for a new user.
  await knex("notification").update({ receive_legacy_changes: true });
  await knex.raw(`
    INSERT INTO notification_review (action, personne)
    SELECT a.id, n.personne FROM action_dossier a
    JOIN notification n ON n.dossier = a.dossier
    WHERE a.author_petitionnaire AND a.data->>'notification_legacy' = 'true'
      AND (a.created_at <= n.viewed_at OR (n.viewed_at IS NULL AND n.viewed))
    ON CONFLICT (action, personne) DO NOTHING
  `);
}

export async function down(knex: Knex) {
  await knex.raw(`
    ALTER TABLE notification ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
    DROP TRIGGER notification_follow_transition ON edge_personne_follows_dossier;
    DROP FUNCTION notify_pitchou_follow();
    DROP TRIGGER notification_arrival_insert ON dossier;
    DROP FUNCTION notify_pitchou_arrival();
  `);
  await knex.schema.dropTable("notification_review");
  await knex.schema.alterTable("notification", (table) => {
    table.dropColumns("arrival_viewed", "follow_revision", "follow_at", "receive_legacy_changes");
  });
  await knex.schema.dropTable("notification_arrival");
}
