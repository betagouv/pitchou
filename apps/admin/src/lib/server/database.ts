import knex, { type Knex } from "knex";

export const directDatabaseConnection: Knex = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

export function closeDatabaseConnection(): ReturnType<Knex["destroy"]> {
  return directDatabaseConnection.destroy();
}
