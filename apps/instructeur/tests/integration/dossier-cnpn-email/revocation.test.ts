import "./setup.ts";
import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { sendEmail } from "@pitchou/server/emails.ts";
import { db } from "../../setup/db.ts";
import { createInstructeurWithDossier } from "../../factories/index.ts";
import { sessionUserId } from "../../helpers/auth.ts";
import { POST } from "../../../src/routes/dossier/[dossierId]/cnpn-email/+server.ts";

test("CNPN authorization is rechecked when reserving a send after waiting for revocation", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const revocation = await db.transaction();
  let response: Promise<unknown> | undefined;
  try {
    const {
      rows: [{ pid }],
    } = await revocation.raw("select pg_backend_pid() as pid");
    await revocation("auth_permission_bundle").where({ user_id: instructeur.id }).delete();
    response = Promise.resolve(
      POST({
        locals: { user: { id: sessionUserId(instructeur.cap) } },
        params: { dossierId: String(instructeur.dossier.id) },
        request: new Request("http://localhost/cnpn-email", {
          method: "POST",
          body: JSON.stringify({
            requestId: randomUUID(),
            subject: "Saisine",
            htmlBody: "<p>Bonjour</p>",
            cc: [],
            attachmentIds: [],
          }),
        }),
      } as Parameters<typeof POST>[0]),
    ).catch((error: unknown) => error);
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
    expect(await response).toMatchObject({ status: 403 });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(await db("dossier_cnpn_email_sent_event")).toEqual([]);
  } finally {
    if (!revocation.isCompleted()) await revocation.rollback();
    await response;
  }
});
