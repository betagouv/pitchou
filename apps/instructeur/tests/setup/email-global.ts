import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeAdminKnex, makeKnex, databaseUrl } from "./db.ts";

export const EMAIL_TEST_DB_NAME = "pitchou_test_notifications";

export default async function setup() {
  const admin = makeAdminKnex();
  const db = makeKnex(EMAIL_TEST_DB_NAME);
  try {
    await admin.raw("DROP DATABASE IF EXISTS ??", [EMAIL_TEST_DB_NAME]);
    await admin.raw("CREATE DATABASE ??", [EMAIL_TEST_DB_NAME]);
    process.env.DATABASE_URL = databaseUrl(EMAIL_TEST_DB_NAME);
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
    await db.migrate.latest({ directory: path.join(root, "libs/database/migrations") });
  } finally {
    await db.destroy();
    await admin.destroy();
  }
  return async () => {
    const admin = makeAdminKnex();
    try {
      await admin.raw(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ? AND pid <> pg_backend_pid()",
        [EMAIL_TEST_DB_NAME],
      );
      await admin.raw("DROP DATABASE ??", [EMAIL_TEST_DB_NAME]);
    } finally {
      await admin.destroy();
    }
  };
}
