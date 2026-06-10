import knex, { type Knex } from "knex";

export const TEST_DB_HOST = process.env.TEST_DB_HOST ?? "127.0.0.1";
export const TEST_DB_PORT = Number(process.env.TEST_DB_PORT ?? 5433);
export const TEST_DB_USER = process.env.TEST_DB_USER ?? "dev";
export const TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD ?? "dev_password";

export const INTEGRATION_DB_NAME = "pitchou_test";
export const E2E_DB_NAME = "pitchou_test_e2e";

const adminUrl = `postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/postgres`;

export function databaseUrl(dbName: string): string {
  return `postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/${dbName}`;
}

export function makeKnex(dbName: string): Knex {
  return knex({
    client: "pg",
    connection: databaseUrl(dbName),
    pool: { min: 0, max: 5 },
  });
}

export function makeAdminKnex(): Knex {
  return knex({
    client: "pg",
    connection: adminUrl,
    pool: { min: 0, max: 2 },
  });
}

const targetDbName = process.env.PITCHOU_TEST_DB_NAME ?? INTEGRATION_DB_NAME;

export const db: Knex = makeKnex(targetDbName);
