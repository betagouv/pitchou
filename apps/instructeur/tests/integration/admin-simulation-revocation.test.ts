import { afterEach, expect, test, vi } from "vitest";
import { getSessionUser } from "@pitchou/server/users.ts";
import { db } from "../setup/db.ts";
import { admin } from "../helpers/administration.ts";
import { POST } from "../../../admin/src/routes/api/dossiers/[dossierId]/simuler-synchronisation/+server.ts";

afterEach(() => vi.unstubAllEnvs());

test.each([
  { champ: "name", valeur: "Modifié" },
  { type: "especes", impactType: null },
])("a staging simulation queued behind revocation rejects: %j", async (body) => {
  // The HTTP integration server uses production settings, where this route is
  // disabled. Execute the actual handler with staging settings for both branches.
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  const actor = await admin();
  const user = await getSessionUser(actor.id);
  const revocation = await db.transaction();
  let response: Promise<unknown> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    await revocation("auth_permission_bundle").where({ user_id: actor.id }).delete();
    response = Promise.resolve(
      POST({
        locals: { user },
        params: { dossierId: "1" },
        request: new Request("http://localhost/api/dossiers/1/simuler-synchronisation", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      } as Parameters<typeof POST>[0]),
    ).then(
      (result) => result.status,
      (error: unknown) => {
        if (error && typeof error === "object" && "status" in error) return error.status;
        throw error;
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
        { timeout: 5000 },
      )
      .toBe(1);
    await revocation.commit();
    expect(await response).toBe(403);
    expect(await db("action_dossier")).toEqual([]);
  } finally {
    if (!revocation.isCompleted()) await revocation.commit();
    await response;
  }
});
