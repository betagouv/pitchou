import knex, { type Knex } from "knex";

export const directDatabaseConnection = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
});

export function closeDatabaseConnection(): ReturnType<Knex["destroy"]> {
  return directDatabaseConnection.destroy();
}

export function createTransaction(config?: Knex.TransactionConfig): Promise<Knex.Transaction> {
  return directDatabaseConnection.transaction(config);
}
