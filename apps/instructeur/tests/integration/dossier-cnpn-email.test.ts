import "./dossier-cnpn-email/setup.ts";
import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import {
  attachCapToGroupe,
  createCapDossier,
  createInstructeurWithDossier,
  createPersonne,
  type InstructeurWithDossier,
} from "../factories/index.ts";
import type { SendCnpnEmailRequest } from "@pitchou/types/API_Pitchou.ts";
import { sendEmail } from "@pitchou/server/emails.ts";

async function postEmail(
  instructeur: Pick<InstructeurWithDossier, "cap" | "dossier">,
  overrides: Partial<SendCnpnEmailRequest> = {},
) {
  const { POST } = await import("../../src/routes/dossier/[dossierId]/cnpn-email/+server.ts");
  const url = new URL(
    `http://localhost/dossier/${instructeur.dossier.id}/cnpn-email?cap=${instructeur.cap}`,
  );
  const request = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: randomUUID(),
      subject: "Saisine CNPN",
      htmlBody: "<p>Bonjour</p>",
      cc: [],
      attachmentIds: [],
      ...overrides,
    }),
  });
  return POST({
    params: { dossierId: String(instructeur.dossier.id) },
    url,
    request,
  } as Parameters<typeof POST>[0]);
}

test.each([
  { seedEmail: undefined, email: "dev@localhost.local", cc: [] },
  { seedEmail: undefined, email: "DEV@localhost.local", cc: ["arbitrary@example.com"] },
  { seedEmail: " Demo@Example.com ", email: "demo@example.com", cc: ["arbitrary@example.com"] },
])(
  "blocks the public staging identity before an attempt, $email / $cc",
  async ({ seedEmail, email, cc }) => {
    vi.stubEnv("SEED_EMAIL", seedEmail);
    const instructeur = await createInstructeurWithDossier(db, { email });

    await expect(
      postEmail(instructeur, { recipient: "external@example.com", cc }),
    ).rejects.toMatchObject({
      status: 403,
      body: { message: expect.stringContaining("démonstration") },
    });
    expect(sendEmail).not.toHaveBeenCalled();
    await expect(db("dossier_cnpn_email_sent_event")).resolves.toEqual([]);
  },
);

test("allows a real staging tester on the same dossier as the public account", async () => {
  const demo = await createInstructeurWithDossier(db, { email: "dev@localhost.local" });
  const tester = await createPersonne(db, { email: "tester@example.com" });
  const { cap } = await createCapDossier(db, tester.codeAcces);
  await attachCapToGroupe(db, cap, demo.groupeId);

  const response = await postEmail({ cap, dossier: demo.dossier }, { cc: ["copy@example.com"] });

  expect(response.status).toBe(201);
  expect(sendEmail).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      to: [tester.email],
      replyTo: tester.email,
      cc: ["copy@example.com"],
    }),
  );
  await expect(db("dossier_cnpn_email_sent_event").first()).resolves.toMatchObject({
    sent_by: tester.id,
    sent_by_email: tester.email,
    status: "sent",
  });
});

test("rejects a capability without dossier access before sending", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const outsider = await createInstructeurWithDossier(db, { nomGroupe: "Other group" });

  await expect(
    postEmail({ cap: outsider.cap, dossier: instructeur.dossier }),
  ).rejects.toMatchObject({
    status: 403,
  });
  expect(sendEmail).not.toHaveBeenCalled();
  await expect(db("dossier_cnpn_email_sent_event")).resolves.toEqual([]);
});

test.each(["accurate", "underreported"])(
  "rejects 15 MiB of actual attachments with %s DB sizes before an attempt",
  async (metadata) => {
    const instructeur = await createInstructeurWithDossier(db);
    const attachment = await createFichierS3(db, await getTestS3(), {
      bytes: Buffer.alloc(15 * 1024 * 1024),
    });
    if (metadata === "underreported")
      await db("file").where({ id: attachment.id }).update({ size: "1" });
    await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
      dossier: instructeur.dossier.id,
      fichier: attachment.id,
    });

    await expect(postEmail(instructeur, { attachmentIds: [attachment.id] })).rejects.toMatchObject({
      status: 413,
    });
    expect(sendEmail).not.toHaveBeenCalled();
    await expect(db("dossier_cnpn_email_sent_event")).resolves.toEqual([]);
  },
);

test("includes the body and cumulative MIME size, then allows editing after a 413", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const s3 = await getTestS3();
  const attachments = await Promise.all(
    [1, 2].map((index) =>
      createFichierS3(db, s3, {
        name: `piece-${index}.pdf`,
        bytes: Buffer.alloc(7_200_000),
      }),
    ),
  );
  const attachmentIds = attachments.map(({ id }) => id);
  // The actual 14.4 MB fits with a short body, but not with the long body below.
  // Deliberately overstate DB metadata to prove it is not the source of truth.
  await db("file").whereIn("id", attachmentIds).update({ size: "20000000" });
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert(
    attachmentIds.map((fichier) => ({
      dossier: instructeur.dossier.id,
      fichier,
    })),
  );
  const requestId = randomUUID();

  await expect(
    postEmail(instructeur, {
      requestId,
      attachmentIds,
      htmlBody: `<p>${"x".repeat(199_000)}</p>`,
    }),
  ).rejects.toMatchObject({ status: 413 });
  expect(sendEmail).not.toHaveBeenCalled();
  await expect(db("dossier_cnpn_email_sent_event")).resolves.toEqual([]);

  expect((await postEmail(instructeur, { requestId, attachmentIds })).status).toBe(201);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(
    vi.mocked(sendEmail).mock.calls[0]![0].attachments?.map(({ content }) => content.length),
  ).toEqual([7_200_000, 7_200_000]);
  await expect(
    db("dossier_cnpn_email_sent_event").where({ id: requestId }).first(),
  ).resolves.toMatchObject({ status: "sent" });
});
