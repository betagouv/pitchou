import { connectUser, getSessionUser } from "@pitchou/server/users.ts";
import { expect, test } from "vitest";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

function members(token: string, groupId: string, method: string, body: object, origin?: string) {
  return fetch(`${INTEGRATION_BASE_URL}/parametres/groupes/${groupId}/membres`, {
    method,
    headers: {
      "Content-Type": "application/json",
      cookie: `pitchou_session=${token}`,
      origin: origin ?? INTEGRATION_BASE_URL,
    },
    body: JSON.stringify(body),
  });
}

test("a colleague who has already signed in receives membership on the same account", async () => {
  const owner = await createInstructeurWithDossier(db);
  const colleague = await connectUser(
    {
      issuer: "https://proconnect.test",
      subject: "returning",
      email: "returning@example.org",
      firstNames: "Alex",
      lastName: "Martin",
    },
    db,
  );
  expect((await getSessionUser(colleague.id, db))?.groupes).toEqual([]);
  expect(
    (await members(owner.cap, owner.groupeId, "POST", { email: colleague.email })).status,
  ).toBe(200);
  const current = await getSessionUser(colleague.id, db);
  expect(current?.groupes.map((group) => group.id)).toEqual([owner.groupeId]);
  expect(current?.permissions).toContain("dossier:instruct");
  expect(await db("auth_user").where({ email: colleague.email })).toHaveLength(1);
});
