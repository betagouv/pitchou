import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { ADMIN_BASE_URL } from "../setup/integration-global.ts";
import { admin } from "../helpers/administration.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";

test("a queued administrator self-save cannot restore permissions revoked while it waited", async () => {
  const actor = await admin();
  const revocation = await db.transaction();
  let request: Promise<Response> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    await revocation("auth_permission_bundle").where({ user_id: actor.id }).delete();
    request = fetchAuthenticated(actor.token, `${ADMIN_BASE_URL}/api/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: actor.id,
        email: actor.email,
        active: true,
        bundles: ["administrateur"],
        grants: [],
        exclusions: [],
      }),
    });
    // Prove the request passed route authorization and is waiting on the revocation lock.
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
    const response = await request;
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      message: "Gestion des utilisateurs non autorisée",
    });
    expect(await db("auth_permission_bundle").where({ user_id: actor.id })).toEqual([]);
    expect(await db("administration_event").where({ action: "user_saved" })).toEqual([]);
  } finally {
    if (!revocation.isCompleted()) await revocation.rollback();
    await request;
  }
});

test("an authorized self-save still cannot remove the actor's own administration permissions", async () => {
  const actor = await admin();
  const response = await fetchAuthenticated(actor.token, `${ADMIN_BASE_URL}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: actor.id,
      email: actor.email,
      active: true,
      bundles: [],
      grants: [],
      exclusions: [],
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    message: "Vous ne pouvez pas retirer vos propres droits d'administration des utilisateurs",
  });
  expect(await db("auth_permission_bundle").where({ user_id: actor.id }).pluck("bundle")).toEqual([
    "administrateur",
  ]);
});
