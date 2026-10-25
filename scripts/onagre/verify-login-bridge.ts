import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

type Connection = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string): Promise<unknown>;
};
const { Client } = createRequire(import.meta.url)("pg") as {
  Client: new (config: { connectionString: string }) => Connection;
};
const configured = process.env.ONAGRE_VERIFY_ADMIN_URL;
if (!configured)
  throw new Error("Set ONAGRE_VERIFY_ADMIN_URL to an explicit loopback PostgreSQL admin URL.");
const url = new URL(configured);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.search)
  throw new Error("Only a loopback database without query overrides is permitted.");
const name = `login_bridge_verify_${randomUUID().replaceAll("-", "")}`;
const admin = new Client({ connectionString: url.href });
await admin.connect();
let created = false;
let db: typeof import("@pitchou/server/database.ts").directDatabaseConnection | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = `/${name}`;
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  ({ directDatabaseConnection: db } = await import("@pitchou/server/database.ts"));
  await db.migrate.latest({
    directory: fileURLToPath(new URL("../../libs/database/migrations/", import.meta.url)),
    loadExtensions: [".ts"],
  });
  const { acceptHandoff } = await import("../../apps/admin/src/lib/server/loginBridge/accept.ts");
  const { randomValue } = await import("../../apps/admin/src/lib/server/loginBridge/tokens.ts");
  const { readSession } = await import("@pitchou/server/session.ts");
  const identity = {
    issuer: "https://provider.example.fr",
    subject: "test-user",
    email: "team@example.fr",
    firstNames: "Test",
    lastName: "User",
  };
  const handoff = (overrides = {}) => ({
    id: randomValue(),
    expiresAt: new Date(Date.now() + 60000),
    identity,
    ...overrides,
  });
  const [user] = await db("auth_user")
    .insert({ email: identity.email, active: true, permissions_configured: true })
    .returning("id");
  await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
  const first = handoff();
  const token = await acceptHandoff(db, first);
  assert(token);
  const session = await readSession(token, db);
  assert.equal(session?.id, user.id);
  assert.equal(session?.idToken, null);
  assert(session.permissions.includes("admin:access"));
  await assert.rejects(acceptHandoff(db, first), /already used/u);
  assert.equal(Number((await db("session").count("* as count").first())?.count), 1);
  const simultaneous = handoff();
  const outcomes = await Promise.allSettled([
    acceptHandoff(db, simultaneous),
    acceptHandoff(db, simultaneous),
  ]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((result) => result.status === "rejected").length, 1);
  assert.equal(Number((await db("session").count("* as count").first())?.count), 2);
  const missing = handoff({
    identity: { ...identity, subject: "unknown", email: "unknown@example.fr" },
  });
  assert.equal(await acceptHandoff(db, missing), null);
  assert.equal(Number((await db("auth_user").count("* as count").first())?.count), 1);
  await assert.rejects(acceptHandoff(db, missing), /already used/u);
  await db("auth_user").where({ id: user.id }).update({ active: false });
  assert.equal(await acceptHandoff(db, handoff()), null);
  await db("auth_user").where({ id: user.id }).update({ active: true });
  await db("auth_permission_bundle").where({ user_id: user.id }).delete();
  assert.equal(await acceptHandoff(db, handoff()), null);
  await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
  await assert.rejects(
    acceptHandoff(db, handoff({ expiresAt: new Date(Date.now() - 1000) })),
    /expired/u,
  );
  await assert.rejects(
    acceptHandoff(db, handoff({ identity: { ...identity, subject: "different-identity" } })),
    /autre identité/u,
  );
  const failing = handoff();
  await db.raw(
    "CREATE FUNCTION reject_test_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Deliberate session failure'; END; $$",
  );
  await db.raw(
    "CREATE TRIGGER reject_test_session BEFORE INSERT ON session FOR EACH ROW EXECUTE FUNCTION reject_test_session()",
  );
  await assert.rejects(acceptHandoff(db, failing), /Deliberate session failure/u);
  assert.equal(await db("auth_login_handoff").where({ id: failing.id }).first(), undefined);
  await db.raw("DROP TRIGGER reject_test_session ON session");
  assert(await acceptHandoff(db, failing));
  console.log(
    "PASS: all migrations; permitted local identity/session; no provider token; single-use and concurrent replay; unknown, disabled and unpermitted accounts; expiry; identity conflict; atomic rollback on deliberate session failure.",
  );
} finally {
  await db?.destroy();
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
