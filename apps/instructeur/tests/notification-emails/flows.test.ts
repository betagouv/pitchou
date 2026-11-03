import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { sendEmail } from "@pitchou/server/emails.ts";
import { beforeEach, expect, test, vi } from "vitest";
import { POST as updateAvis } from "../../src/routes/avis-expert/+server.ts";
import { POST as updateControle } from "../../src/routes/controle/+server.ts";
import { POST as updateDecision } from "../../src/routes/decision-administrative/+server.ts";
import { POST as updateInstruction } from "../../src/routes/dossier/[dossierId]/+server.ts";
import { PUT as updateCommentaire } from "../../src/routes/dossier/[dossierId]/commentaires/+server.ts";
import { POST as assignFollowers } from "../../src/routes/dossier/[dossierId]/followers/+server.ts";
import { POST as updatePrescription } from "../../src/routes/prescription/+server.ts";
import { sessionUserId } from "../helpers/auth.ts";
import { setup } from "./fixtures.ts";

vi.mock("@pitchou/server/emails.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pitchou/server/emails.ts")>()),
  sendEmail: vi.fn().mockResolvedValue({ messageId: "simulated" }),
}));
function event(cap: string, dossierId: number, body: unknown) {
  return {
    url: new URL("http://pitchou.test/"),
    locals: { user: { id: sessionUserId(cap) } },
    params: { dossierId: String(dossierId) },
    request: new Request("http://pitchou.test/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as never;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PUBLIC_SITE_URL_PITCHOU", "https://pitchou.test");
});

test("the assignment endpoint persists colleague follows and sends only once", async () => {
  const { actor, recipient } = await setup();
  await changeDossierAccess(db, (notificationTrx) =>
    notificationTrx("edge_personne_follows_dossier").where({ personne: recipient.id }).delete(),
  );
  const request = () =>
    event(actor.cap, actor.dossier.id, { personneEmails: [actor.email, recipient.email] });
  expect((await assignFollowers(request())).status).toBe(204);
  expect(await db("edge_personne_follows_dossier").where({ personne: recipient.id })).toHaveLength(
    1,
  );
  expect(await db("action_dossier")).toMatchObject([
    { type: "dossier_suivi", data: { follower: recipient.email } },
  ]);
  expect(await db("email_notification_outbox")).toMatchObject([
    { personne: recipient.id, kind: "assignment", status: "sent" },
  ]);
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: [recipient.email] }));
  expect((await assignFollowers(request())).status).toBe(204);
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(await db("action_dossier")).toHaveLength(1);
  expect(await db("email_notification_outbox")).toHaveLength(1);
});

test("instruction endpoint queues actual changes, excluding identical submitted values", async () => {
  const { actor, recipient } = await setup();
  await db("dossier").where({ id: actor.dossier.id }).update({ enjeu: false });
  await updateInstruction(event(actor.cap, actor.dossier.id, { enjeu: false }));
  expect(await db("email_notification_outbox")).toHaveLength(0);
  await updateInstruction(event(actor.cap, actor.dossier.id, { enjeu: true }));
  expect((await db("email_notification_outbox")).map((r) => r.personne)).toEqual([recipient.id]);
});

test.each(["avis", "controle", "prescription", "commentaire", "decision"])(
  "%s endpoint distinguishes a saved change from a no-op",
  async (flow) => {
    const { actor, recipient } = await setup();
    const dossier = actor.dossier.id;
    const [file] = await db("file").insert({ name: "arrete.pdf", size: "12" }).returning("id");
    const [decision] = await db("decision_administrative")
      .insert({
        dossier,
        type: "Arrêté dérogation",
        number: "AP-001",
        fichier: file.id,
        signature_date: "2026-04-15",
        obligations_end_date: "2031-04-15",
      })
      .returning("id");
    const [prescription] = await db("prescription")
      .insert({ decision_administrative: decision.id, description: "Initial" })
      .returning("id");
    let call: (changed: boolean) => Response | Promise<Response>;
    if (flow === "avis") {
      const [avis] = await db("avis_expert")
        .insert({ dossier, expert: "CNPN", avis: "Favorable" })
        .returning("id");
      call = (changed) =>
        updateAvis(
          event(actor.cap, dossier, {
            id: avis.id,
            dossier,
            expert: "CNPN",
            avis: changed ? "Défavorable" : "Favorable",
          }),
        );
    } else if (flow === "controle") {
      const [controle] = await db("controle")
        .insert({ prescription: prescription.id, result: "Conforme" })
        .returning("id");
      call = (changed) =>
        updateControle(
          event(actor.cap, dossier, {
            id: controle.id,
            prescription: prescription.id,
            result: changed ? "Non conforme" : "Conforme",
          }),
        );
    } else if (flow === "prescription") {
      call = (changed) =>
        updatePrescription(
          event(actor.cap, dossier, {
            id: prescription.id,
            description: changed ? "Modifiée" : "Initial",
          }),
        );
    } else if (flow === "decision") {
      call = (changed) =>
        updateDecision(
          event(actor.cap, dossier, {
            id: decision.id,
            dossier,
            number: changed ? "AP-002" : "AP-001",
            type: "Arrêté dérogation",
            signature_date: "2026-04-15",
            obligations_end_date: "2031-04-15",
          }),
        );
    } else {
      const [commentaire] = await db("commentaire")
        .insert({ dossier, personne: actor.id, content: "Initial" })
        .returning("id");
      call = (changed) =>
        updateCommentaire(
          event(actor.cap, dossier, {
            id: commentaire.id,
            content: changed ? "Modifié" : "Initial",
          }),
        );
    }
    await call(false);
    expect(await db("email_notification_outbox")).toHaveLength(0);
    await call(true);
    expect((await db("email_notification_outbox")).map((r) => r.personne)).toEqual([recipient.id]);
    expect(sendEmail).not.toHaveBeenCalled();
  },
);
