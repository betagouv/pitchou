import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";
import { admin } from "../helpers/administration.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { adminWriteCases, adminWriteFixture, adminWriteSnapshot } from "../helpers/admin-writes.ts";

test("admin mutations queued behind permission revocation reject without changing data", async () => {
  const actor = await admin();
  const fixture = await adminWriteFixture();
  const before = await adminWriteSnapshot();
  for (const operation of adminWriteCases(fixture)) {
    await db("auth_permission_bundle")
      .insert({ user_id: actor.id, bundle: "administrateur" })
      .onConflict(["user_id", "bundle"])
      .ignore();
    const revocation = await db.transaction();
    let response: Promise<Response> | undefined;
    try {
      const {
        rows: [{ pid }],
      } = await revocation.raw("select pg_backend_pid() as pid");
      await revocation("auth_permission_bundle").where({ user_id: actor.id }).delete();
      response = fetchAuthenticated(actor.token, `${ADMIN_BASE_URL}/api${operation.path}`, {
        method: operation.method,
        headers: { "content-type": "application/json" },
        body: operation.body ? JSON.stringify(operation.body) : undefined,
      });
      await expect
        .poll(
          async () => {
            const { rows } = await db.raw(
              "select pid from pg_stat_activity where datname = current_database() and ? = any(pg_blocking_pids(pid)) and query like '%pg_advisory_xact_lock%'",
              [pid],
            );
            return rows.length;
          },
          {
            timeout: 5000,
            message: `${operation.method} ${operation.path} must wait for access changes`,
          },
        )
        .toBe(1);
      await revocation.commit();
      expect((await response).status, `${operation.method} ${operation.path}`).toBe(403);
      expect(await adminWriteSnapshot()).toEqual(before);
    } finally {
      // Keep the actor revoked even when an assertion fails, so queued external
      // operations such as synchronization can never start during cleanup.
      if (!revocation.isCompleted()) await revocation.commit();
      await response;
    }
  }
}, 30_000);
