import knexLib from "knex";
import config from "../knexfile.ts";

// Destructive: drops and recreates the public schema (all tables, data and
// migration history). Hard guard so this can NEVER run against production —
// it only proceeds when PUBLIC_PITCHOU_ENV is explicitly "staging".
if (process.env.PUBLIC_PITCHOU_ENV !== "staging") {
  console.error(
    `✗ wipe-schema refused: PUBLIC_PITCHOU_ENV is "${process.env.PUBLIC_PITCHOU_ENV ?? ""}", expected "staging"`,
  );
  process.exit(1);
}

const db = knexLib(config.staging);

try {
  await db.raw("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("✔ public schema wiped");
} finally {
  await db.destroy();
}
