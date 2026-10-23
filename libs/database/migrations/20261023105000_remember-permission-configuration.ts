import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.schema.alterTable("auth_user", (table) => {
    table.boolean("permissions_configured").notNullable().defaultTo(false);
  });
  await db.raw(`
    UPDATE auth_user u SET permissions_configured = true
    WHERE EXISTS (SELECT 1 FROM auth_permission_bundle p WHERE p.user_id = u.id)
      OR EXISTS (SELECT 1 FROM auth_permission p WHERE p.user_id = u.id)
      OR EXISTS (SELECT 1 FROM auth_permission_exclusion p WHERE p.user_id = u.id)
      OR EXISTS (SELECT 1 FROM user_groupe m WHERE m.user_id = u.id)
      OR EXISTS (SELECT 1 FROM administration_event e WHERE e.action = 'user_saved' AND e.data->>'id' = u.id::text);

    CREATE FUNCTION remember_pitchou_permission_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP <> 'INSERT' THEN
        UPDATE auth_user SET permissions_configured = true WHERE id = OLD.user_id AND NOT permissions_configured;
      END IF;
      IF TG_OP <> 'DELETE' THEN
        UPDATE auth_user SET permissions_configured = true WHERE id = NEW.user_id AND NOT permissions_configured;
      END IF;
      RETURN NULL;
    END $$;
  `);
  for (const table of ["auth_permission_bundle", "auth_permission", "auth_permission_exclusion"])
    await db.raw(
      `CREATE TRIGGER permission_configuration AFTER INSERT OR UPDATE OR DELETE ON ??
      FOR EACH ROW EXECUTE FUNCTION remember_pitchou_permission_configuration()`,
      [table],
    );
}

export async function down(db: Knex) {
  for (const table of ["auth_permission_bundle", "auth_permission", "auth_permission_exclusion"])
    await db.raw("DROP TRIGGER permission_configuration ON ??", [table]);
  await db.raw("DROP FUNCTION remember_pitchou_permission_configuration()");
  await db.schema.alterTable("auth_user", (table) => table.dropColumn("permissions_configured"));
}
