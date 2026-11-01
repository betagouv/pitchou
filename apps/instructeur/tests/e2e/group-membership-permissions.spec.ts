import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { allowGroupManagement } from "../helpers/groupMembership.ts";

for (const permissions of [[], ["admin:access"], ["groups:manage"]]) {
  test(`group members cannot invite or remove peers with ${permissions.join(", ") || "no admin permission"}`, async ({
    page,
    db,
    loginAs,
  }) => {
    const owner = await createInstructeurWithCapToGroup(db, { nomGroupe: "Bretagne" });
    if (permissions.length > 0)
      await db("auth_permission").insert(
        permissions.map((permission) => ({ user_id: owner.id, permission })),
      );
    await loginAs(owner.codeAcces);
    await page.goto("/parametres/groupes");
    const group = page.getByRole("region", { name: "Bretagne", exact: true });
    await expect(group.getByText(`${owner.email} (vous)`, { exact: true })).toBeVisible();
    await expect(
      page.getByText("contactez un administrateur Pitchou", { exact: false }),
    ).toBeVisible();
    await expect(group.getByRole("combobox")).toHaveCount(0);
    await expect(group.getByRole("button", { name: /Ajouter|Retirer|Quitter/u })).toHaveCount(0);
    const statuses = await page.evaluate(
      async ({ groupId, userId }) => {
        const url = `/parametres/groupes/${groupId}/membres`;
        const statuses: number[] = [];
        for (const [method, body] of [
          ["POST", { email: "forbidden@example.org" }],
          ["DELETE", { userId }],
        ] as const) {
          const response = await fetch(url, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          statuses.push(response.status);
        }
        return statuses;
      },
      { groupId: owner.groupeId, userId: owner.id },
    );
    expect(statuses).toEqual([403, 403]);
    expect(await db("auth_user").where({ email: "forbidden@example.org" })).toHaveLength(0);
    expect(await db("user_groupe").where({ user_id: owner.id })).toHaveLength(1);
    expect(await db("administration_event")).toHaveLength(0);
  });
}

test("revoked group management cannot use controls from an already opened page", async ({
  page,
  db,
  loginAs,
}) => {
  const owner = await createInstructeurWithCapToGroup(db, { nomGroupe: "Bretagne" });
  await allowGroupManagement(db, owner.id);
  await loginAs(owner.codeAcces);
  await page.goto("/parametres/groupes");
  const group = page.getByRole("region", { name: "Bretagne", exact: true });
  const input = group.getByRole("combobox", {
    name: "Ajouter un membre par adresse professionnelle",
  });
  await expect(input).toBeVisible();
  await db("auth_permission_exclusion").insert({ user_id: owner.id, permission: "groups:manage" });
  await input.fill("revoked@example.org");
  await group.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(group.getByRole("alert")).toContainText("réservés aux administrateurs");
  expect(await db("auth_user").where({ email: "revoked@example.org" })).toHaveLength(0);
  await page.reload();
  await expect(group.getByRole("combobox")).toHaveCount(0);
});
