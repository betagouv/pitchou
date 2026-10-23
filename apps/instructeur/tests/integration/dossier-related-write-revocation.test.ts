import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import {
  dossierWriteCases,
  dossierWriteFixture,
  dossierWriteSnapshot,
} from "../helpers/dossier-writes.ts";

test("every dossier mutation queued behind revocation rejects without changing data", async () => {
  const fixture = await dossierWriteFixture();
  const before = await dossierWriteSnapshot(fixture.dossier);
  // Exercise the built HTTP routes, including session and route authorization.
  for (const operation of dossierWriteCases(fixture)) {
    await db("auth_permission_bundle")
      .insert({ user_id: fixture.instructeur.id, bundle: "instructeur" })
      .onConflict(["user_id", "bundle"])
      .ignore();
    const revocation = await db.transaction();
    let response: Promise<Response> | undefined;
    try {
      const {
        rows: [{ pid }],
      } = await revocation.raw("select pg_backend_pid() as pid");
      await revocation("auth_permission_bundle")
        .where({ user_id: fixture.instructeur.id })
        .delete();
      response = fetchAuthenticated(
        fixture.instructeur.cap,
        `${INTEGRATION_BASE_URL}${operation.path}`,
        {
          method: operation.method,
          headers: { "content-type": "application/json" },
          body: operation.body ? JSON.stringify(operation.body) : undefined,
        },
      );
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
      expect((await response).status, `${operation.method} ${operation.path}`).toBe(
        operation.status ?? 403,
      );
      expect(await dossierWriteSnapshot(fixture.dossier)).toEqual(before);
    } finally {
      if (!revocation.isCompleted()) await revocation.rollback();
      await response;
    }
  }
}, 30_000);
