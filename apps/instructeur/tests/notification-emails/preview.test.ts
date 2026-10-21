import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import { deliverPreviewNoveltyEmails } from "../../preview/noveltyEmails.ts";
import { setup } from "./fixtures.ts";

const inboxUrl = "http://127.0.0.1:8025/__fleet/mail/";
const deliver = () =>
  deliverPreviewNoveltyEmails({ inboxUrl, siteUrl: "https://pitchou.test", db });
let capture = vi.fn();
beforeEach(() => {
  capture = vi.fn().mockImplementation(async () => Response.json({ ID: "local-mail" }));
  vi.stubGlobal("fetch", capture);
});
afterEach(() => vi.unstubAllGlobals());

test("sends a future grouped novelty locally once, then allows a later new modification", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  await action("enjeu_renseigne");
  expect(await db("email_notification_outbox")).toHaveLength(1);
  const original = await db("email_notification_outbox").first();
  expect(original.due_at.getTime()).toBeGreaterThan(Date.now());
  expect(await deliver()).toEqual({ sent: 1, failed: 0 });
  expect(capture).toHaveBeenCalledExactlyOnceWith(
    new URL(`${inboxUrl}api/v1/send`),
    expect.objectContaining({ method: "POST", redirect: "error" }),
  );
  const payload = JSON.parse(capture.mock.calls[0][1].body);
  expect(payload.To).toEqual([{ Email: "recipient@test.fr" }]);
  expect(payload.Subject).toMatch(/^Nouveauté:/u);
  expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  expect(capture).toHaveBeenCalledOnce();
  await action("avis_modifie");
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(1);
  expect(await deliver()).toEqual({ sent: 1, failed: 0 });
  expect(capture).toHaveBeenCalledTimes(2);
  const rows = await db("email_notification_outbox");
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.status === "sent")).toBe(true);
  expect(rows.find((row) => row.id === original.id)?.batch_key).toBe(
    `fleet-preview:${original.id}`,
  );
  expect(rows[0].id).not.toBe(rows[1].id);
});

test.each(["preference", "follow", "access"])("preserves the %s delivery check", async (change) => {
  const { action, recipient, actor } = await setup();
  await action("avis_modifie");
  if (change === "preference")
    await db("email_notification_preferences")
      .where({ personne: recipient.id })
      .update({ novelty: false });
  if (change === "follow")
    await db("edge_personne_follows_dossier")
      .where({ personne: recipient.id, dossier: actor.dossier.id })
      .delete();
  if (change === "access")
    await db("edge_cap_dossier__groupe_instructeurs")
      .where({ cap_dossier: recipient.cap })
      .delete();
  expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  expect(capture).not.toHaveBeenCalled();
});

test("self actions, suivi and generated documents do not produce preview novelty mail", async () => {
  const { action, recipient, actor } = await setup();
  await action("avis_modifie", {
    author_personne: recipient.id as ActionDossierInitializer["author_personne"],
  });
  expect((await db("email_notification_outbox")).map((row) => row.personne)).toEqual([actor.id]);
  await db("edge_personne_follows_dossier").where({ personne: actor.id }).delete();
  await action("document_genere");
  await action("dossier_suivi");
  expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  expect(capture).not.toHaveBeenCalled();
});

test("does not accelerate or dispatch assignment and arrival messages", async () => {
  const { actor, action, recipient } = await setup();
  await action("dossier_suivi", { data: { follower: recipient.email } });
  await db("email_notification_outbox").insert({
    personne: recipient.id,
    dossier: actor.dossier.id,
    kind: "arrival",
    batch_key: "unrelated",
    due_at: new Date(Date.now() + 86400000),
  });
  const before = await db("email_notification_outbox").orderBy("id");
  expect(before).toHaveLength(2);
  expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  expect(capture).not.toHaveBeenCalled();
  expect(await db("email_notification_outbox").orderBy("id")).toEqual(before);
});

test("a broken inbox never falls back to Brevo and retries retain the frozen message", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  capture.mockRejectedValueOnce(new Error("inbox unavailable"));
  expect(await deliver()).toEqual({ sent: 0, failed: 1 });
  expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  const [row] = await db("email_notification_outbox");
  expect(row.status).toBe("pending");
  await db("email_notification_outbox")
    .where({ id: row.id })
    .update({ retry_at: new Date(0) });
  expect(await deliver()).toEqual({ sent: 1, failed: 0 });
  expect(capture.mock.calls[0][1].body).toBe(capture.mock.calls[1][1].body);
  expect(capture.mock.calls.every(([url]) => new URL(url).hostname === "127.0.0.1")).toBe(true);
});

test("invalid capture configuration fails before mutating the queue", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const before = await db("email_notification_outbox");
  await expect(
    deliverPreviewNoveltyEmails({
      db,
      inboxUrl: "https://api.brevo.com",
      siteUrl: "https://pitchou.test",
    }),
  ).rejects.toThrow();
  expect(await db("email_notification_outbox")).toEqual(before);
  expect(capture).not.toHaveBeenCalled();
});

test("concurrent clicks claim the same pending novelty only once", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  let release: () => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  capture.mockImplementationOnce(async () => {
    started();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    return Response.json({ ID: "local-mail" });
  });
  const first = deliver();
  await ready;
  try {
    expect(await deliver()).toEqual({ sent: 0, failed: 0 });
  } finally {
    release();
  }
  expect(await first).toEqual({ sent: 1, failed: 0 });
  expect(capture).toHaveBeenCalledOnce();
});
