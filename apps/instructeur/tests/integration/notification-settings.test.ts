import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

const url = `${INTEGRATION_BASE_URL}/parametres/notifications`;
test("notification settings belong to the session and remain usable without a group", async () => {
  const owner = await createInstructeurWithDossier(db);
  const other = await createInstructeurWithDossier(db, { nomGroupe: "Other" });
  await db("user_groupe").where({ user_id: owner.id }).delete();
  const session = await (
    await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/api/session`)
  ).json();
  expect(session.getEmailNotificationPreferences).toBe("/parametres/notifications");
  expect(session.listerDossiers).toBeUndefined();
  const preferences = { arrival: false, assignment: true, novelty: false };
  const response = await fetchAuthenticated(owner.cap, url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  expect(response.status).toBe(200);
  expect(await (await fetchAuthenticated(owner.cap, url)).json()).toEqual(preferences);
  expect(await (await fetchAuthenticated(other.cap, url)).json()).toEqual({
    arrival: true,
    assignment: true,
    novelty: true,
  });
  expect(
    (
      await fetchAuthenticated(owner.cap, url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, personne: other.id }),
      })
    ).status,
  ).toBe(400);
  expect((await fetch(url)).status).toBe(401);
  expect(
    (
      await fetch(url, {
        method: "POST",
        headers: {
          cookie: `pitchou_session=${owner.cap}`,
          origin: "https://foreign.test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      })
    ).status,
  ).toBe(403);
});
