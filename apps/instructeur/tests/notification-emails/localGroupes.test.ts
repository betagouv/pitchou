import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import { dispatch } from "./fixtures.ts";

test("arrival covers all owning groups and sends one email to shared members", async () => {
  const { member, colleague, outsider, dossier } = await setupArrival();
  await db("user_groupe").insert({ user_id: member.id, groupe_instructeurs: outsider.groupeId });
  await db.transaction(async (trx) => {
    await trx("edge_groupe_instructeurs__dossier").insert([
      { dossier: dossier.id, groupe_instructeurs: member.groupeId },
      { dossier: dossier.id, groupe_instructeurs: outsider.groupeId },
    ]);
  });
  expect(await db("email_notification_groupe_arrival")).toHaveLength(2);
  expect(await db("email_notification_outbox")).toHaveLength(3);
  // Losing one group does not cancel the same arrival for a member of the other.
  await db("edge_groupe_instructeurs__dossier")
    .where({ dossier: dossier.id, groupe_instructeurs: member.groupeId })
    .delete();
  const result = await dispatch(new Date());
  expect(result.send.mock.calls.flatMap(([message]) => message.to).sort()).toEqual(
    [member.email, outsider.email].sort(),
  );
  expect(
    await db("email_notification_outbox").where({ personne: colleague.id }).first(),
  ).toMatchObject({ status: "cancelled" });
});

test.each(["disabled", "permission", "archived"])("delivery excludes %s access", async (change) => {
  const { arrive, member, dossier } = await setupArrival();
  await arrive();
  if (change === "disabled")
    await db("auth_user").where({ id: member.id }).update({ active: false });
  if (change === "permission")
    await db("auth_permission_exclusion").insert({
      user_id: member.id,
      permission: "dossier:read",
    });
  if (change === "archived")
    await db("groupe_instructeurs").where({ id: member.groupeId }).update({ active: false });
  const result = await dispatch(new Date());
  expect(result.send.mock.calls.flatMap(([message]) => message.to)).not.toContain(member.email);
  expect(
    await db("email_notification_outbox")
      .where({ personne: member.id, dossier: dossier.id })
      .first(),
  ).toMatchObject({ status: "cancelled" });
});
