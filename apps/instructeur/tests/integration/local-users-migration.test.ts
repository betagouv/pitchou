import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { makeAdminKnex, makeKnex } from "../setup/db.ts";

const directory = new URL("../../../../libs/database/migrations/", import.meta.url);
const databaseName = "pitchou_test_users_migration";

test("migration preserves staff history and applicants while moving memberships to local users", async () => {
  const admin = makeAdminKnex();
  const db = makeKnex(databaseName);
  const initialAdmins = process.env.PITCHOU_ADMIN_EMAILS;
  try {
    await admin.raw("CREATE DATABASE ??", [databaseName]);
    const names = (await readdir(directory)).filter((name) => name.endsWith(".ts")).sort();
    const migrationSource = (migrations: string[]) => ({
      getMigrations: async () => migrations,
      getMigrationName: (name: string) => name,
      getMigration: (name: string) =>
        import(/* @vite-ignore */ fileURLToPath(new URL(name, directory))),
    });
    await db.migrate.latest({
      migrationSource: migrationSource(names.filter((name) => name < "20261005")),
    });
    const [instructor] = await db("personne")
      .insert({ email: "agent@example.org", first_names: "Camille", access_code: "legacy-secret" })
      .returning("*");
    const [applicant] = await db("personne")
      .insert({ email: "applicant@example.org", first_names: "Applicant" })
      .returning("*");
    const [cap] = await db("cap_dossier")
      .insert({ personne_cap: instructor.access_code })
      .returning("*");
    const [group] = await db("groupe_instructeurs")
      .insert({ name: "Existing service", demarche_number: 88444 })
      .returning("*");
    await db("edge_cap_dossier__groupe_instructeurs").insert({
      cap_dossier: cap.cap,
      groupe_instructeurs: group.id,
    });
    const [dossier] = await db("dossier")
      .insert({
        depot_date: new Date(),
        source: "demarche_numerique",
        demarche_number: 88444,
        primary_department: "75",
        demandeur_personne_physique: applicant.id,
      })
      .returning("*");
    await db("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: group.id,
    });
    await db("commentaire").insert({
      dossier: dossier.id,
      personne: instructor.id,
      content: "Historical staff comment",
    });
    await db("edge_personne_follows_dossier").insert({
      dossier: dossier.id,
      personne: instructor.id,
    });
    process.env.PITCHOU_ADMIN_EMAILS = "bootstrap@example.org";
    await db.migrate.latest({ migrationSource: migrationSource(names) });

    expect(await db("auth_user").where({ id: instructor.id }).first()).toMatchObject({
      email: instructor.email,
      first_names: "Camille",
    });
    expect(await db("auth_user").where({ email: applicant.email })).toHaveLength(0);
    expect(await db("personne").where({ id: applicant.id }).first()).toMatchObject({
      first_names: "Applicant",
    });
    expect(await db("user_groupe").where({ user_id: instructor.id })).toMatchObject([
      { groupe_instructeurs: group.id },
    ]);
    expect(await db("groupe_departement")).toMatchObject([
      { groupe_instructeurs: group.id, department: "75" },
    ]);
    expect(await db("groupe_instructeurs").where({ id: group.id }).first()).toMatchObject({
      coverage_needs_review: true,
    });
    expect(await db("edge_personne_follows_dossier")).toMatchObject([
      { personne: instructor.id, dossier: dossier.id },
    ]);
    const history = await db("commentaire as c")
      .join("auth_user as u", "u.id", "c.personne")
      .select("c.content", "u.email");
    expect(history).toEqual([{ content: "Historical staff comment", email: instructor.email }]);
    expect(await db("auth_permission_bundle").where({ user_id: instructor.id })).toMatchObject([
      { bundle: "instructeur" },
    ]);
    expect(
      await db("auth_user as u")
        .join("auth_permission_bundle as b", "u.id", "b.user_id")
        .where({ "u.email": "bootstrap@example.org", bundle: "administrateur" }),
    ).toHaveLength(1);
    expect(await db.schema.hasTable("cap_dossier")).toBe(false);
    const [newUser] = await db("auth_user").insert({ email: "next@example.org" }).returning("id");
    expect(newUser.id).toBeGreaterThan(instructor.id);
  } finally {
    if (initialAdmins === undefined) delete process.env.PITCHOU_ADMIN_EMAILS;
    else process.env.PITCHOU_ADMIN_EMAILS = initialAdmins;
    await db.destroy();
    await admin.raw("DROP DATABASE IF EXISTS ??", [databaseName]);
    await admin.destroy();
  }
}, 60_000);
