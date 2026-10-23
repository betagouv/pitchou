import { expect, test, vi } from "vitest";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import * as history from "@pitchou/server/database/action_dossier.ts";
import { POST } from "../../src/routes/dossier/[dossierId]/+server.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { expectDatabaseWaiter } from "../helpers/databaseLocks.ts";
import { db } from "../setup/db.ts";

test("synchronization history and an instructor save use the same lock order", async () => {
  const user = await createInstructeurWithDossier(db);
  const dossierId = user.dossier.id;
  await db("dossier").where({ id: dossierId }).update({ demarche_numerique_number: "990001" });
  const dossier = await db("dossier").where({ id: dossierId }).first();
  const written = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  const logActions = history.logActionsDossier;
  const spy = vi.spyOn(history, "logActionsDossier").mockImplementationOnce(async (...args) => {
    await logActions(...args);
    written.resolve();
    await resume.promise;
  });
  const sync = await db.transaction();
  const {
    rows: [{ pid }],
  } = await sync.raw("select pg_backend_pid() as pid");
  const synchronization = dumpDossiers(
    [],
    [
      {
        dossier: {
          demarche_numerique_number: "990001",
          name: "Nom synchronisé",
          primary_department: dossier.primary_department,
        },
        evenement_phase_dossier: [],
        decision_administrative: [],
      },
    ],
    sync,
  ).then(
    async () => {
      await sync.commit();
    },
    async (error: unknown) => {
      await sync.rollback();
      return error;
    },
  );
  let save: Promise<unknown> | undefined;
  try {
    await written.promise;
    save = Promise.resolve(
      POST({
        locals: { user: { id: user.id } },
        params: { dossierId: String(dossierId) },
        request: new Request("http://localhost/dossier/1", {
          method: "POST",
          body: JSON.stringify({ enjeu: true }),
        }),
      } as Parameters<typeof POST>[0]),
    ).then(
      (response) => response.status,
      (error: unknown) => error,
    );
    // History already holds a dossier FK lock. The save must wait on access, not the row.
    await expectDatabaseWaiter(pid, "%pg_advisory_xact_lock%");
  } finally {
    resume.resolve();
    await synchronization;
    await save;
    spy.mockRestore();
  }
  expect(await synchronization).toBeUndefined();
  expect(await save).toBe(200);
  expect(await db("dossier").where({ id: dossierId }).first()).toMatchObject({
    name: "Nom synchronisé",
    enjeu: true,
  });
});
