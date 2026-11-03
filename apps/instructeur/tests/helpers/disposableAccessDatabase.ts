import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { makeAdminKnex, makeKnex } from "../setup/db.ts";

export async function disposableAccessDatabase(before?: string) {
  const name = `pitchou_test_access_${randomUUID().replaceAll("-", "")}`;
  const admin = makeAdminKnex();
  const db = makeKnex(name);
  let created = false;
  async function close() {
    await db.destroy();
    try {
      if (created) await admin.raw("DROP DATABASE ??", [name]);
    } finally {
      await admin.destroy();
    }
  }
  try {
    await admin.raw("CREATE DATABASE ??", [name]);
    created = true;
    const directory = path.resolve(import.meta.dirname, "../../../../libs/database/migrations");
    const migrate = (cutoff?: string) =>
      db.migrate.latest({
        migrationSource: {
          getMigrations: async () =>
            (await readdir(directory))
              .filter((file) => file.endsWith(".ts") && (!cutoff || file < cutoff))
              .sort(),
          getMigrationName: (file: string) => file,
          getMigration: (file: string) => import(path.join(directory, file)),
        },
      });
    await migrate(before);
    return { db, close, migrateToLatest: () => migrate() };
  } catch (error) {
    await close();
    throw error;
  }
}
