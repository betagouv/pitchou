import type { Knex } from "knex";

// Keep historical actor IDs. Applicant/contact records remain in personne.
const actors = [
  ["commentaire", "personne"],
  ["action_dossier", "author_personne"],
  ["evenement_phase_dossier", "caused_by_personne"],
  ["dossier_cnpn_email_sent_event", "sent_by"],
  ["evenement_metrique", "personne"],
  ["dossier_search", "personne"],
  ["notification", "personne"],
  ["notification_review", "personne"],
  ["edge_personne_follows_dossier", "personne"],
] as const;

export async function up(db: Knex) {
  await db.schema.createTable("auth_user", (t) => {
    t.increments("id");
    t.text("email");
    t.text("first_names");
    t.text("last_name");
    t.boolean("active").notNullable().defaultTo(true);
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    t.timestamp("first_login_at", { useTz: true });
    t.timestamp("last_login_at", { useTz: true });
  });
  const actorQueries = actors.map(([table, column]) => `select ${column} as id from ${table}`);
  await db.raw(`insert into auth_user (id, email, first_names, last_name)
    select p.id, lower(trim(p.email)), p.first_names, p.last_name from personne p
    where p.id in (${actorQueries.join(" union ")})
      or exists (select 1 from cap_dossier c where c.personne_cap = p.access_code)
      or exists (select 1 from cap_evenement_metrique c where c.personne_cap = p.access_code)
      or exists (select 1 from edge_personne__cap_annotation_write c where c.personne_cap = p.access_code)`);
  // Fail on conflicting identities rather than silently combine their permissions.
  await db.raw(
    "create unique index auth_user_email_unique on auth_user (lower(email)) where email is not null",
  );
  await db.raw(
    "select setval(pg_get_serial_sequence('auth_user','id'), coalesce(max(id), 1), max(id) is not null) from auth_user",
  );
  for (const [table, column] of actors) {
    const { rows } = await db.raw(
      `select c.conname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'f' and c.conrelid = ?::regclass and a.attname = ?`,
      [table, column],
    );
    for (const { conname } of rows)
      await db.raw("alter table ?? drop constraint ??", [table, conname]);
    await db.schema.alterTable(table, (t) => {
      t.foreign(column).references("id").inTable("auth_user").onDelete("RESTRICT");
    });
  }
  await db.schema.createTable("auth_identity", (t) => {
    t.text("issuer").notNullable();
    t.text("subject").notNullable();
    t.integer("user_id").notNullable().references("id").inTable("auth_user").onDelete("CASCADE");
    t.primary(["issuer", "subject"]);
    t.index("user_id");
  });
  for (const [table, column] of [
    ["auth_permission", "permission"],
    ["auth_permission_exclusion", "permission"],
    ["auth_permission_bundle", "bundle"],
  ]) {
    await db.schema.createTable(table, (t) => {
      t.integer("user_id").notNullable().references("id").inTable("auth_user").onDelete("CASCADE");
      t.text(column).notNullable();
      t.primary(["user_id", column]);
    });
  }
  await db.raw(`insert into auth_permission_bundle (user_id, bundle)
    select p.id, 'instructeur' from personne p join cap_dossier c on c.personne_cap = p.access_code`);
  const initialAdmins = (process.env.PITCHOU_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  for (const email of initialAdmins) {
    let user = await db("auth_user").where({ email }).first();
    if (!user) [user] = await db("auth_user").insert({ email }).returning("id");
    await db("auth_permission_bundle")
      .insert({ user_id: user.id, bundle: "administrateur" })
      .onConflict(["user_id", "bundle"])
      .ignore();
  }
  await db.schema.createTable("user_groupe", (t) => {
    t.integer("user_id").notNullable().references("id").inTable("auth_user").onDelete("CASCADE");
    t.uuid("groupe_instructeurs")
      .notNullable()
      .references("id")
      .inTable("groupe_instructeurs")
      .onDelete("CASCADE");
    t.primary(["user_id", "groupe_instructeurs"]);
    t.index("groupe_instructeurs");
  });
  await db.raw(`insert into user_groupe select distinct p.id, e.groupe_instructeurs
    from edge_cap_dossier__groupe_instructeurs e join cap_dossier c on c.cap = e.cap_dossier
    join personne p on p.access_code = c.personne_cap`);
  await db.schema.alterTable("groupe_instructeurs", (t) => {
    t.integer("demarche_number").nullable().alter();
    t.boolean("active").notNullable().defaultTo(true);
    t.boolean("coverage_needs_review").notNullable().defaultTo(true);
  });
  await db.schema.createTable("groupe_departement", (t) => {
    t.uuid("groupe_instructeurs")
      .notNullable()
      .references("id")
      .inTable("groupe_instructeurs")
      .onDelete("CASCADE");
    t.text("department").notNullable();
    t.primary(["groupe_instructeurs", "department"]);
    t.index("department");
  });
  // Initial coverage is an inventory of existing ownership, flagged for admin review.
  await db.raw(`insert into groupe_departement select distinct e.groupe_instructeurs, d.primary_department
    from edge_groupe_instructeurs__dossier e join dossier d on d.id = e.dossier
    where d.primary_department is not null`);
  const { rows: constraints } = await db.raw(`select conname from pg_constraint
    where conrelid = 'edge_groupe_instructeurs__dossier'::regclass and contype = 'u'`);
  for (const { conname } of constraints)
    await db.raw("alter table edge_groupe_instructeurs__dossier drop constraint ??", [conname]);
  await db.schema.alterTable("edge_groupe_instructeurs__dossier", (t) =>
    t.unique(["dossier", "groupe_instructeurs"]),
  );
  // Sessions must be re-established with a stable ProConnect identity.
  await db("session").delete();
  await db.schema.alterTable("session", (t) => {
    t.integer("user_id").notNullable().references("id").inTable("auth_user").onDelete("CASCADE");
  });
  await db.schema.createTable("administration_event", (t) => {
    t.bigIncrements("id");
    t.integer("actor").references("id").inTable("auth_user");
    t.text("action").notNullable();
    t.jsonb("data").notNullable();
    t.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });
}

export async function down() {
  throw new Error(
    "Restore a pre-migration backup with the matching application version; local user administration cannot be rolled back to DN synchronization.",
  );
}
