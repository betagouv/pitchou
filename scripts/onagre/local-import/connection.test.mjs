import test from "node:test";
import assert from "node:assert/strict";
import { connect } from "./connection.mjs";

test(
  "commit failures are reported and a later transaction can still commit",
  { skip: process.env.RUN_ONAGRE_DATABASE_TESTS !== "1" },
  async () => {
    // connect() rejects every target except the pinned local development database.
    const client = await connect({ ...process.env, NODE_ENV: "development" });
    try {
      await client.begin();
      await client.query(`CREATE TEMP TABLE import_commit_check (
        value integer UNIQUE DEFERRABLE INITIALLY DEFERRED
      ) ON COMMIT DROP`);
      await client.query("INSERT INTO import_commit_check VALUES (1), (1)");
      await assert.rejects(client.finish(true), { code: "23505" });
      await client.begin();
      const result = await client.query(
        "SELECT to_regclass('pg_temp.import_commit_check') AS name",
      );
      assert.equal(result.rows[0].name, null);
      await client.query("CREATE TEMP TABLE import_commit_check(value integer) ON COMMIT DROP");
      await client.query("INSERT INTO import_commit_check VALUES (2)");
      await client.finish(true);
      await client.begin();
      await client.finish(false);
    } finally {
      await client.end();
    }
  },
);
