import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { allowGroupManagement } from "../helpers/groupMembership.ts";

test.each([
  { permissions: [] },
  { permissions: ["admin:access"] },
  { permissions: ["groups:manage"] },
])(
  "membership writes reject a peer with $permissions without changing accounts or access",
  async ({ permissions }) => {
    const owner = await createInstructeurWithDossier(db);
    if (permissions.length > 0)
      await db("auth_permission").insert(
        permissions.map((permission) => ({ user_id: owner.id, permission })),
      );
    await db("edge_personne_follows_dossier").insert({
      personne: owner.id,
      dossier: owner.dossier.id,
    });
    const url = `${INTEGRATION_BASE_URL}/parametres/groupes/${owner.groupeId}/membres`;
    for (const [method, body] of [
      ["POST", { email: "forbidden@example.org" }],
      ["DELETE", { userId: owner.id }],
    ] as const) {
      const response = await fetchAuthenticated(owner.cap, url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(403);
    }
    expect(await db("auth_user").where({ email: "forbidden@example.org" })).toHaveLength(0);
    expect(await db("auth_permission_bundle")).toHaveLength(1);
    expect(await db("user_groupe").where({ user_id: owner.id })).toHaveLength(1);
    expect(await db("edge_personne_follows_dossier")).toHaveLength(1);
    expect(await db("administration_event")).toHaveLength(0);
    expect((await fetchAuthenticated(owner.cap, url)).status).toBe(200);
  },
);

test("membership management requires administrator rights but no dossier permissions", async () => {
  const owner = await createInstructeurWithDossier(db);
  await allowGroupManagement(db, owner.id);
  await db("auth_permission_exclusion").insert(
    ["dossier:read", "dossier:instruct"].map((permission) => ({ user_id: owner.id, permission })),
  );
  const response = await fetchAuthenticated(
    owner.cap,
    `${INTEGRATION_BASE_URL}/parametres/groupes/${owner.groupeId}/membres`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.org" }),
    },
  );
  expect(response.status).toBe(200);
  expect((await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/dossiers`)).status).toBe(
    403,
  );
});
