import knex, { type Knex } from "knex";

export const directDatabaseConnection = knex({
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: {
    afterCreate(
      connection: {
        query: (sql: string, values: string[], callback: (error: Error | null) => void) => void;
      },
      done: (error: Error | null, connection: unknown) => void,
    ) {
      const environment = process.env.FLEET_PITCHOU_CONTEXT
        ? "preview"
        : process.env.NODE_ENV === "test"
          ? "test"
          : process.env.PUBLIC_PITCHOU_ENV === "staging"
            ? "staging"
            : process.env.NODE_ENV === "production"
              ? "production"
              : "development";
      connection.query(
        "SELECT set_config('pitchou.environment', $1, false)",
        [environment],
        (error) => done(error, connection),
      );
    },
  },
});

export function closeDatabaseConnection(): ReturnType<Knex["destroy"]> {
  return directDatabaseConnection.destroy();
}

export function createTransaction(config?: Knex.TransactionConfig): Promise<Knex.Transaction> {
  return directDatabaseConnection.transaction(config);
}
