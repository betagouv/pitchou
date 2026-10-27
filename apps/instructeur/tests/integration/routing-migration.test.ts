import { readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { makeAdminKnex, makeKnex } from "../setup/db.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/index.ts";
import { up } from "../../../../libs/database/migrations/20261027120000_flexible-groupe-assignment.ts";

test("upgrade preserves department assignments, exceptional edges and follows without backlog notifications", async () => {
  const name = "pitchou_test_routing_upgrade";
  const admin = makeAdminKnex();
  const db = makeKnex(name);
  let created = false;
  try {
    // CREATE fails if a previous database exists, rather than deleting unknown contents.
    await admin.raw("CREATE DATABASE ??", [name]);
    created = true;
    const directory = path.resolve(import.meta.dirname, "../../../../libs/database/migrations");
    await db.migrate.latest({
      migrationSource: {
        getMigrations: async () =>
          (await readdir(directory))
            .filter((file) => file.endsWith(".ts") && file < "20261027120000")
            .sort(),
        getMigrationName: (file: string) => file,
        getMigration: (file: string) => import(path.join(directory, file)),
      },
    });
    const group = await createGroupeInstructeurs(db);
    const manual = await createGroupeInstructeurs(db, { name: "Manual exception" });
    await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "75" });
    const dossier = await createDossier(db, { primary_department: "75" });
    const [user] = await db("auth_user").insert({ email: "upgrade@test.fr" }).returning("id");
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "instructeur" });
    await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
    await db("edge_personne_follows_dossier").insert({ personne: user.id, dossier: dossier.id });
    await db("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: manual.id,
    });
    await db("email_notification_outbox").delete();
    const before = await db("edge_groupe_instructeurs__dossier").orderBy("groupe_instructeurs");
    await db.transaction(up);
    expect(await db("edge_groupe_instructeurs__dossier").orderBy("groupe_instructeurs")).toEqual(
      before,
    );
    expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
    expect(await db("groupe_dossier_override")).toMatchObject([
      { dossier: dossier.id, groupe_instructeurs: manual.id, mode: "include" },
    ]);
    expect(await db("email_notification_outbox")).toHaveLength(0);
    await db.raw("SELECT refresh_pitchou_ownership(NULL)");
    expect(await db("edge_groupe_instructeurs__dossier").orderBy("groupe_instructeurs")).toEqual(
      before,
    );
  } finally {
    await db.destroy();
    try {
      if (created) await admin.raw("DROP DATABASE ??", [name]);
    } finally {
      await admin.destroy();
    }
  }
}, 60_000);
