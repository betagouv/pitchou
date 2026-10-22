import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import { dispatch } from "./fixtures.ts";

test("routes a dossier to multiple groups and sends one arrival per recipient", async () => {
  const { member, colleague, outsider, dossier } = await setupArrival();
  await db("user_groupe").insert({ user_id: member.id, groupe_instructeurs: outsider.groupeId });
  await db("groupe_departement").insert([
    { groupe_instructeurs: member.groupeId, department: "75" },
    { groupe_instructeurs: outsider.groupeId, department: "75" },
  ]);
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  expect(await db("email_notification_groupe_arrival")).toHaveLength(2);
  expect((await db("email_notification_outbox")).map((row) => row.personne).sort()).toEqual(
    [member.id, colleague.id, outsider.id].sort(),
  );
  // Removing one of a recipient's groups must preserve their other group's arrival.
  await db("groupe_departement").where({ groupe_instructeurs: member.groupeId }).delete();
  const result = await dispatch(new Date());
  expect(result.send.mock.calls.map(([message]) => message.to[0]).sort()).toEqual(
    [member.email, outsider.email].sort(),
  );
});

test.each(["inactive", "excluded", "read-only"])(
  "does not send arrivals to an account that becomes %s",
  async (change) => {
    const { arrive, member, colleague } = await setupArrival();
    await arrive();
    if (change === "inactive")
      await db("auth_user").where({ id: member.id }).update({ active: false });
    if (change === "excluded")
      await db("auth_permission_exclusion").insert({
        user_id: member.id,
        permission: "dossier:instruct",
      });
    if (change === "read-only")
      await db("auth_permission_bundle").where({ user_id: member.id }).delete();
    const result = await dispatch(new Date());
    expect(result.send.mock.calls.map(([message]) => message.to)).toEqual([[colleague.email]]);
  },
);
