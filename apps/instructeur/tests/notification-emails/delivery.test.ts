import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { setup, dispatch } from "./fixtures.ts";

test("retries a transient failure with the same frozen payload and idempotency key", async () => {
  const { action, actor } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValue({ messageId: "ok" });
  expect((await dispatch(row.due_at, send)).result).toEqual({ sent: 0, failed: 1 });
  await db("dossier")
    .where({ id: actor.dossier.id })
    .update({ name: "Changed after first attempt" });
  await dispatch(new Date(row.due_at.getTime() + 30_000), send);
  expect(send).toHaveBeenCalledOnce();
  await dispatch(new Date(row.due_at.getTime() + 60_000), send);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  expect((await db("email_notification_outbox").first()).status).toBe("sent");
});

test("does not repeat an ambiguous send after the provider deduplication window", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await dispatch(row.due_at, vi.fn().mockRejectedValue(new Error("timeout")));
  const retry = await dispatch(new Date(row.due_at.getTime() + 26 * 60_000));
  expect(retry.send).not.toHaveBeenCalled();
  expect((await db("email_notification_outbox").first()).status).toBe("uncertain");
});

test("explicit provider rejections can be retried after a long outage", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await dispatch(
    row.due_at,
    vi.fn().mockRejectedValue({ response: new Response(null, { status: 429 }) }),
  );
  expect((await db("email_notification_outbox").first()).first_attempt_at).toBeNull();
  expect((await dispatch(new Date(row.due_at.getTime() + 86400000))).send).toHaveBeenCalledOnce();
});

test("a Brevo duplicate response acknowledges the previous accepted send", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  const result = await dispatch(
    row.due_at,
    vi.fn().mockRejectedValue({
      response: Response.json({ code: "duplicate_parameter" }, { status: 400 }),
    }),
  );
  expect(result.result).toEqual({ sent: 1, failed: 0 });
  expect((await db("email_notification_outbox").first()).status).toBe("sent");
});

test("concurrent workers claim each message once", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  let finish: () => void = () => {};
  let started: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const send = vi.fn().mockImplementation(async () => {
    started();
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const first = dispatch(row.due_at, send);
  await ready;
  const second = await dispatch(row.due_at, send);
  expect(second.result).toEqual({ sent: 0, failed: 0 });
  finish();
  await first;
  expect(send).toHaveBeenCalledOnce();
});

test("recovers a crashed worker's expired claim with its original message", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  await db("email_notification_outbox")
    .where({ id: row.id })
    .update({ claimed_at: row.due_at, first_attempt_at: row.due_at });
  expect((await dispatch(new Date(row.due_at.getTime() + 60_000))).send).not.toHaveBeenCalled();
  expect((await dispatch(new Date(row.due_at.getTime() + 121_000))).send).toHaveBeenCalledOnce();
});

test("dry-run lists eligible jobs without changing state or sending", async () => {
  const { action } = await setup();
  await action("avis_modifie");
  const [row] = await db("email_notification_outbox");
  const send = vi.fn();
  const result = await dispatchDossierNotificationEmails({
    db,
    now: row.due_at,
    dryRun: true,
    send,
    siteUrl: "https://pitchou.test",
  });
  expect(result).toMatchObject({ dryRun: true, candidates: [{ id: row.id }] });
  expect(send).not.toHaveBeenCalled();
  expect(await db("email_notification_outbox").first()).toEqual(row);
});

test("disabling or unfollowing discards pending news; only a new change queues after re-enabling", async () => {
  const { action, recipient, actor } = await setup();
  await action("avis_modifie");
  await db("email_notification_preferences")
    .where({ personne: recipient.id })
    .update({ novelty: false });
  await db("email_notification_preferences")
    .where({ personne: recipient.id })
    .update({ novelty: true });
  const [row] = await db("email_notification_outbox");
  expect((await dispatch(row.due_at)).send).not.toHaveBeenCalled();
  await action("controle_modifie");
  expect((await db("email_notification_outbox").first()).status).toBe("pending");
  await db("edge_personne_follows_dossier").where({ personne: recipient.id }).delete();
  await db("edge_personne_follows_dossier").insert({
    personne: recipient.id,
    dossier: actor.dossier.id,
  });
  expect((await dispatch(row.due_at)).send).not.toHaveBeenCalled();
});

test("keeps separate messages for each dossier followed by the same recipient", async () => {
  const { action, recipient, actor } = await setup();
  const [second] = await db("dossier")
    .insert({
      name: "Second dossier",
      source: "demarche_numerique",
      depot_date: new Date(),
      demarche_number: 88444,
    })
    .returning("id");
  await db("edge_groupe_instructeurs__dossier").insert({
    dossier: second.id,
    groupe_instructeurs: actor.groupeId,
  });
  await db("edge_personne_follows_dossier").insert({ dossier: second.id, personne: recipient.id });
  await action("avis_modifie");
  await db("action_dossier").insert({
    dossier: second.id,
    type: "controle_modifie",
    author_personne: actor.id,
  });
  const rows = await db("email_notification_outbox").orderBy("dossier");
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.personne)).toEqual([recipient.id, recipient.id]);
  const now = new Date(Math.max(...rows.map((row) => row.due_at.getTime())));
  expect((await dispatch(now)).send).toHaveBeenCalledTimes(2);
});
