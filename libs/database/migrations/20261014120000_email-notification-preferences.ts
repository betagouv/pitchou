import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("email_notification_preferences", (table) => {
    table.integer("personne").primary().references("id").inTable("auth_user").onDelete("CASCADE");
    table.boolean("assignment").notNullable().defaultTo(true);
    table.boolean("novelty").notNullable().defaultTo(true);
  });
  await knex.raw(`
    INSERT INTO email_notification_preferences (personne) SELECT id FROM auth_user;
    CREATE FUNCTION initialize_email_notification_preferences() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO email_notification_preferences (personne) VALUES (NEW.id);
      RETURN NEW;
    END $$;
    CREATE TRIGGER email_notification_preferences_insert AFTER INSERT ON auth_user
      FOR EACH ROW EXECUTE FUNCTION initialize_email_notification_preferences();
  `);
}

export async function down(knex: Knex) {
  await knex.raw(`
    DROP TRIGGER email_notification_preferences_insert ON auth_user;
    DROP FUNCTION initialize_email_notification_preferences();
  `);
  await knex.schema.dropTable("email_notification_preferences");
}
