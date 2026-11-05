import assert from "node:assert/strict";
import { after, test } from "node:test";
import { columnNames, relation, tables, textColumns } from "./catalog.ts";
import { readOptions, safeFailure, TransferRefusal } from "./connection.ts";
import { createFixture } from "./fixtures.ts";
import { runTransfer } from "./run.ts";

const fixture = await createFixture();
after(fixture.cleanup);
const options = (apply = false) =>
  readOptions(apply ? ["--apply"] : [], {
    ONAGRE_DEPLOYMENT_ROLE: "rehearsal",
    ONAGRE_TRANSFER_SOURCE_URL: fixture.sourceUrl,
    DATABASE_URL: fixture.targetUrl,
    ONAGRE_EXPECTED_DATABASE: new URL(fixture.targetUrl).pathname.slice(1),
  });

test("configuration refuses missing role, identical endpoints, overrides, and redacts failures", () => {
  const env = {
    ONAGRE_TRANSFER_SOURCE_URL: fixture.sourceUrl,
    DATABASE_URL: fixture.targetUrl,
    ONAGRE_EXPECTED_DATABASE: new URL(fixture.targetUrl).pathname.slice(1),
  };
  assert.throws(() => readOptions([], env), /rehearsal/u);
  assert.throws(() => readOptions(["--reset"], env), /Usage/u);
  assert.throws(
    () =>
      readOptions([], {
        ...env,
        ONAGRE_DEPLOYMENT_ROLE: "rehearsal",
        DATABASE_URL: fixture.sourceUrl,
        ONAGRE_EXPECTED_DATABASE: new URL(fixture.sourceUrl).pathname.slice(1),
      }),
    /same database endpoint/u,
  );
  assert.throws(
    () =>
      readOptions([], {
        ...env,
        ONAGRE_DEPLOYMENT_ROLE: "rehearsal",
        DATABASE_URL: `${fixture.targetUrl}?host=elsewhere`,
      }),
    /Unsupported/u,
  );
  assert.doesNotMatch(
    safeFailure(Object.assign(new Error("password=secret"), { code: "23505", detail: "secret" })),
    /secret/u,
  );
  assert.equal(safeFailure(new TransferRefusal("safe refusal")), "safe refusal");
});

test("preview reads all preparation counts and actor plan without changing either database", async () => {
  const result = await runTransfer(options());
  assert.equal(result.mode, "preview");
  assert.equal(result.rows.onagre_source_row, 2501);
  assert.equal(result.replacedSeedRules, 9);
  assert.deepEqual(result.actors, { matched: 1, historyOnly: 1 });
  const counts = await fixture.target.query(
    "select (select count(*) from onagre_snapshot)::int as snapshots, (select count(*) from auth_user)::int as actors",
  );
  assert.deepEqual(counts.rows[0], { snapshots: 0, actors: 1 });
});

test("actual SQL identity catches endpoint aliases", async () => {
  const alias = new URL(fixture.sourceUrl);
  alias.hostname = alias.hostname === "localhost" ? "127.0.0.1" : "localhost";
  await assert.rejects(runTransfer({ ...options(), targetUrl: alias.href }), /same database/u);
});

test("modified seed rules, ambiguous or missing actor email, and incomplete snapshots refuse", async () => {
  await fixture.target.query(
    "update onagre_shared_rule set notes='existing work' where key='source'",
  );
  await assert.rejects(runTransfer(options(true)), /existing work/u);
  await fixture.target.query("update onagre_shared_rule set notes='' where key='source'");
  await fixture.source.query("update auth_user set email=null where id=3");
  await assert.rejects(runTransfer(options(true)), /no email/u);
  await fixture.source.query("update auth_user set email='history@example.test' where id=3");
  await fixture.target.query("insert into auth_user(id,email) values(41,' matched@example.test ')");
  await assert.rejects(runTransfer(options(true)), /ambiguous/u);
  await fixture.target.query("delete from auth_user where id=41");
  await fixture.source.query("update onagre_snapshot set records_complete=false");
  await assert.rejects(runTransfer(options(true)), /incomplete/u);
  await fixture.source.query("update onagre_snapshot set records_complete=true");
});

test("an interrupted copy rolls back seeds, actors, prep rows and sequence restarts", async () => {
  const before = await fixture.target.query(
    "select last_value::text, is_called from onagre_snapshot_id_seq",
  );
  await assert.rejects(
    runTransfer(options(true), () => {
      throw new Error("injected copy interruption");
    }),
    /injected/u,
  );
  assert.deepEqual(
    (await fixture.target.query("select last_value::text, is_called from onagre_snapshot_id_seq"))
      .rows,
    before.rows,
  );
  assert.equal(
    (await fixture.target.query("select count(*)::int as count from onagre_shared_rule")).rows[0]
      .count,
    9,
  );
  assert.equal(
    (await fixture.target.query("select count(*)::int as count from onagre_snapshot")).rows[0]
      .count,
    0,
  );
  assert.equal(
    (await fixture.target.query("select count(*)::int as count from auth_user")).rows[0].count,
    1,
  );
});

test("apply copies every prep value across batches, remaps actors, and excludes auth/application/import data", async () => {
  const result = await runTransfer(options(true));
  assert.equal(result.mode, "applied");
  for (const table of tables) {
    const columns = columnNames(table).filter((column) => column !== "actor_id");
    const sql = `select ${textColumns(columns)} from ${relation(table.name)} order by 1,2`;
    assert.deepEqual(
      (await fixture.target.query(sql)).rows,
      (await fixture.source.query(sql)).rows,
      table.name,
    );
  }
  assert.deepEqual(
    (await fixture.target.query("select actor_id from onagre_mapping_revision")).rows,
    [{ actor_id: 41 }],
  );
  assert.deepEqual(
    (await fixture.target.query("select actor_id from onagre_shared_rule_revision")).rows,
    [{ actor_id: 40 }],
  );
  assert.deepEqual(
    (
      await fixture.target.query(
        "select email, first_names, last_name, active, permissions_configured, first_login_at, last_login_at from auth_user where id=41",
      )
    ).rows,
    [
      {
        email: "history@example.test",
        first_names: "Historic",
        last_name: "Actor",
        active: false,
        permissions_configured: true,
        first_login_at: null,
        last_login_at: null,
      },
    ],
  );
  assert.equal(
    (await fixture.target.query("select first_names from auth_user where id=40")).rows[0]
      .first_names,
    "Target",
  );
  for (const table of [
    "auth_identity",
    "auth_permission",
    "auth_permission_bundle",
    "auth_permission_exclusion",
    "user_groupe",
    "session",
    "dossier",
    "onagre_import_run",
    "onagre_import_identity",
  ])
    assert.equal(
      (await fixture.target.query(`select count(*)::int as count from ${relation(table)}`)).rows[0]
        .count,
      0,
      table,
    );
  for (const table of tables.filter((table) => table.sequence)) {
    const next = await fixture.target.query<{ next: string; maximum: string }>(
      `select nextval(pg_get_serial_sequence($1,'id'))::text as next, max(id)::text as maximum from ${relation(table.name)}`,
      [`public.${table.name}`],
    );
    assert.ok(BigInt(next.rows[0].next) > BigInt(next.rows[0].maximum));
  }
  assert.equal(
    (await fixture.target.query("select nextval('auth_user_id_seq')::int as next")).rows[0].next,
    42,
  );
});

test("replay explicitly refuses a nonempty target", async () => {
  await assert.rejects(runTransfer(options(true)), /nonempty.*Replays/u);
  await assert.rejects(runTransfer(options()), /nonempty.*Replays/u);
});
