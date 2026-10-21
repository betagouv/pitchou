import { expect, test, vi } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { synchronizeDossierInGroupeInstructeur } from "@pitchou/server/database/dossier.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import { dispatch } from "./fixtures.ts";

test("notifies all current group members immediately without requiring suivi", async () => {
  const { arrive, member, colleague, dossier } = await setupArrival();
  await arrive();
  const rows = await db("email_notification_outbox");
  expect(rows.map((row) => row.personne).sort()).toEqual([member.id, colleague.id].sort());
  expect(rows.every((row) => row.kind === "arrival" && row.due_at <= new Date())).toBe(true);
  expect(new Set(rows.map((row) => row.batch_key)).size).toBe(1);
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);
  const result = await dispatch(new Date());
  expect(result.send).toHaveBeenCalledTimes(2);
  expect(result.send.mock.calls[0][0]).toMatchObject({
    subject: "Nouveau dossier: 123456 - Nouveau projet",
    htmlContent: expect.stringContaining(
      "Un nouveau dossier vient d’arriver dans Pitchou et attend d'être suivi par un-e instructeur-trice:",
    ),
  });
  expect(result.send.mock.calls[0][0].htmlContent).toContain(
    `href="https://pitchou.test/dossier/${dossier.id}"`,
  );
  expect(result.send.mock.calls[0][0].htmlContent).toContain(
    'href="https://pitchou.test/parametres"',
  );
  expect((await dispatch(new Date())).send).not.toHaveBeenCalled();
});

test("enforces the arrival preference independently of assignment and novelty", async () => {
  const { arrive, member, colleague } = await setupArrival();
  await db("email_notification_preferences")
    .where({ personne: member.id })
    .update({ assignment: false, novelty: false });
  await db("email_notification_preferences")
    .where({ personne: colleague.id })
    .update({ arrival: false });
  await arrive();
  expect((await db("email_notification_outbox")).map((r) => r.personne)).toEqual([member.id]);
});

test("DN upserts and admin delete/reinsert saves do not notify unchanged groups again", async () => {
  const { arrive, dossier, member } = await setupArrival();
  await arrive();
  await dispatch(new Date());
  await synchronizeDossierInGroupeInstructeur(
    [{ number: 123456, groupeInstructeur: { label: "Arrival group" } }],
    88444,
    db,
  );
  await db.transaction(async (trx) => {
    await trx("edge_groupe_instructeurs__dossier").where({ dossier: dossier.id }).delete();
    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: member.groupeId,
    });
  });
  expect(await db("email_notification_outbox")).toHaveLength(2);
  expect((await dispatch(new Date())).send).not.toHaveBeenCalled();
});

test("a newly synchronized DN group relation queues arrivals without any novelty event", async () => {
  await setupArrival();
  await synchronizeDossierInGroupeInstructeur(
    [{ number: 123456, groupeInstructeur: { label: "Arrival group" } }],
    88444,
    db,
  );
  const rows = await db("email_notification_outbox");
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.kind === "arrival")).toBe(true);
  expect((await dispatch(new Date())).send).toHaveBeenCalledTimes(2);
});

test("a real transfer notifies the receiving group, cancels old pending arrivals and deduplicates return saves", async () => {
  const { arrive, dossier, outsider, member } = await setupArrival();
  await arrive();
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: dossier.id })
    .update({ groupe_instructeurs: outsider.groupeId });
  const rows = await db("email_notification_outbox").where({ status: "pending" });
  expect(rows).toHaveLength(1);
  expect(rows[0].personne).toBe(outsider.id);
  const sent = await dispatch(new Date());
  expect(sent.send).toHaveBeenCalledOnce();
  expect(sent.send.mock.calls[0][0].to).toEqual([outsider.email]);
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: dossier.id })
    .update({ groupe_instructeurs: member.groupeId });
  expect((await dispatch(new Date())).send).toHaveBeenCalledTimes(2);
});

test("uses final transaction membership and never queues rolled-back arrivals", async () => {
  const { dossier, member, colleague } = await setupArrival();
  await expect(
    db.transaction(async (trx) => {
      await trx("edge_groupe_instructeurs__dossier").insert({
        dossier: dossier.id,
        groupe_instructeurs: member.groupeId,
      });
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");
  expect(await db("email_notification_outbox")).toHaveLength(0);
  await db.transaction(async (trx) => {
    await trx("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: member.groupeId,
    });
    await trx("edge_cap_dossier__groupe_instructeurs")
      .whereIn(
        "cap_dossier",
        trx("cap_dossier").select("cap").where({ personne_cap: colleague.codeAcces }),
      )
      .delete();
  });
  expect((await db("email_notification_outbox")).map((r) => r.personne)).toEqual([member.id]);
});

test.each(["preference", "membership", "dossier"])(
  "checks %s before sending a pending arrival",
  async (change) => {
    const { arrive, dossier, member, colleague } = await setupArrival();
    await arrive();
    if (change === "preference")
      await db("email_notification_preferences")
        .where({ personne: member.id })
        .update({ arrival: false });
    if (change === "membership")
      await db("edge_cap_dossier__groupe_instructeurs").where({ cap_dossier: member.cap }).delete();
    if (change === "dossier") await db("dossier").where({ id: dossier.id }).delete();
    const result = await dispatch(new Date());
    expect(result.send.mock.calls.map(([message]) => message.to)).toEqual(
      change === "dossier" ? [] : [[colleague.email]],
    );
  },
);

test("unfollowing does not cancel group arrival mail, and retries reuse the same message", async () => {
  const { arrive, dossier, member } = await setupArrival();
  await arrive();
  await db("edge_personne_follows_dossier").insert({ personne: member.id, dossier: dossier.id });
  await db("edge_personne_follows_dossier")
    .where({ personne: member.id, dossier: dossier.id })
    .delete();
  const now = new Date();
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("timeout"))
    .mockResolvedValue({ messageId: "simulated" });
  await dispatchDossierNotificationEmails({
    db,
    now,
    send,
    kind: "arrival",
    siteUrl: "https://pitchou.test",
  });
  await dispatchDossierNotificationEmails({
    db,
    now: new Date(now.getTime() + 60_000),
    send,
    kind: "arrival",
    siteUrl: "https://pitchou.test",
  });
  expect(send).toHaveBeenCalledTimes(3);
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[2][0]);
});
