import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { makeAdminKnex, makeKnex } from "../setup/db.ts";

const directory = new URL("../../../../libs/database/migrations/", import.meta.url);
const databaseName = "pitchou_test_legacy_follows";

test.each(["batch", "individual"])(
  "%s migration preserves imported follows allowed by final regional coverage",
  async (mode) => {
    const admin = makeAdminKnex();
    const db = makeKnex(databaseName);
    try {
      await admin.raw("CREATE DATABASE ??", [databaseName]);
      const names = (await readdir(directory)).filter((name) => name.endsWith(".ts")).sort();
      const migrationSource = (migrations: string[]) => ({
        getMigrations: async () => migrations,
        getMigrationName: (name: string) => name,
        getMigration: (name: string) =>
          // Vite needs this directive inside the dynamic import.
          // eslint-disable-next-line no-inline-comments
          import(/* @vite-ignore */ fileURLToPath(new URL(name, directory))),
      });
      await db.migrate.latest({
        migrationSource: migrationSource(names.filter((name) => name < "20261023")),
      });
      const groups = await db("groupe_instructeurs")
        .insert([
          { name: "DDT37", demarche_number: 88444 },
          { name: "DREAL Centre Val de Loire", demarche_number: 88444 },
        ])
        .returning("*");
      const users = await db("personne")
        .insert([
          { email: "department@example.org", access_code: "department-legacy" },
          { email: "regional@example.org", access_code: "regional-legacy" },
        ])
        .returning("*");
      for (const [index, user] of users.entries()) {
        const [cap] = await db("cap_dossier")
          .insert({ personne_cap: user.access_code })
          .returning("*");
        await db("edge_cap_dossier__groupe_instructeurs").insert({
          cap_dossier: cap.cap,
          groupe_instructeurs: groups[index].id,
        });
      }
      const [dossier] = await db("dossier")
        .insert({
          depot_date: new Date(),
          source: "demarche_numerique",
          demarche_number: 88444,
          primary_department: "37",
        })
        .returning("id");
      await db("edge_groupe_instructeurs__dossier").insert({
        dossier: dossier.id,
        groupe_instructeurs: groups[0].id,
      });
      // DN imports could create follows outside a user's owning group.
      await db("edge_personne_follows_dossier").insert(
        users.map((user) => ({ dossier: dossier.id, personne: user.id })),
      );
      const config = { migrationSource: migrationSource(names) };
      if (mode === "batch") await db.migrate.latest(config);
      else
        for (const name of names.filter((name) => name >= "20261023"))
          await db.migrate.up({ ...config, name });
      expect(
        await db("edge_groupe_instructeurs__dossier").where({ dossier: dossier.id }),
      ).toMatchObject([{ groupe_instructeurs: groups[1].id }]);
      expect(
        await db("edge_personne_follows_dossier").where({ dossier: dossier.id }),
      ).toMatchObject([{ personne: users[1].id }]);
      expect(
        await db("edge_personne_follows_dossier").where({ personne: users[0].id }),
      ).toHaveLength(0);
      // Runtime cleanup must still work once the migration has completed.
      await db("auth_permission_bundle").where({ user_id: users[1].id }).delete();
      expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
    } finally {
      await db.destroy();
      await admin.raw("DROP DATABASE IF EXISTS ??", [databaseName]);
      await admin.destroy();
    }
  },
  60_000,
);
