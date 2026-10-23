import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test.each(["membership", "group", "coverage", "department", "exclusion"])(
  "a queued dossier write rechecks %s changes",
  async (change) => {
    const instructeur = await createInstructeurWithDossier(db);
    const revocation = await db.transaction();
    let response: Promise<Response> | undefined;
    try {
      const {
        rows: [{ pid }],
      } = await revocation.raw("select pg_backend_pid() as pid");
      if (change === "membership")
        await revocation("user_groupe").where({ user_id: instructeur.id }).delete();
      if (change === "group")
        await revocation("groupe_instructeurs")
          .where({ id: instructeur.groupeId })
          .update({ active: false });
      if (change === "coverage")
        await revocation("groupe_departement")
          .where({ groupe_instructeurs: instructeur.groupeId })
          .delete();
      if (change === "department")
        await revocation("dossier")
          .where({ id: instructeur.dossier.id })
          .update({ primary_department: null });
      if (change === "exclusion")
        await revocation("auth_permission_exclusion").insert({
          user_id: instructeur.id,
          permission: "dossier:instruct",
        });
      response = fetchAuthenticated(
        instructeur.cap,
        `${INTEGRATION_BASE_URL}/dossier/${instructeur.dossier.id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enjeu: true }),
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
      expect((await response).status).toBe(403);
      expect(await db("dossier").where({ id: instructeur.dossier.id }).first()).not.toMatchObject({
        enjeu: true,
      });
      expect(await db("action_dossier").where({ dossier: instructeur.dossier.id })).toEqual([]);
    } finally {
      if (!revocation.isCompleted()) await revocation.rollback();
      await response;
    }
  },
);
