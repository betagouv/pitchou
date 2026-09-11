import { expect, test } from "vitest";
import knex from "knex";
import {
  up,
  down,
} from "../../../../database/migrations/20260911120000_normalize-next-action-entities.ts";

test("entity migration updates only the three retired categories without audit side effects", async () => {
  const queries: { sql: string; bindings: unknown[] }[] = [];
  const db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(
      config: { text: string; values?: unknown[] },
      callback: (error: null, result: object) => void,
    ) {
      queries.push({ sql: config.text, bindings: config.values ?? [] });
      callback(null, { rows: [], rowCount: 0, command: "UPDATE" });
    },
  });
  db.client.releaseConnection = async () => {};
  try {
    await up(db);
    expect(queries).toEqual([
      {
        sql: 'update "dossier" set "next_action_expected_from" = $1 where "next_action_expected_from" in ($2, $3)',
        bindings: ["Tierce personne/administration", "Autre administration", "Autre"],
      },
      {
        sql: 'update "dossier" set "next_action_expected_from" = $1 where "next_action_expected_from" = $2',
        bindings: [null, "Personne"],
      },
    ]);
    queries.length = 0;
    await down();
    expect(queries).toEqual([]);
  } finally {
    await db.destroy();
  }
});
