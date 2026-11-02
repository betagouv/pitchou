import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";

test("removed group members cannot use controls from an already opened page", async ({
  page,
  db,
  loginAs,
}) => {
  const owner = await createInstructeurWithCapToGroup(db, { nomGroupe: "Bretagne" });
  await loginAs(owner.codeAcces);
  await page.goto("/parametres/groupes");
  const group = page.getByRole("region", { name: "Bretagne", exact: true });
  const input = group.getByRole("combobox", {
    name: "Ajouter un membre par adresse professionnelle",
  });
  await expect(input).toBeVisible();
  await db("user_groupe")
    .where({ user_id: owner.id, groupe_instructeurs: owner.groupeId })
    .delete();
  await input.fill("revoked@example.org");
  await group.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(group.getByRole("alert")).toContainText(
    "Vous devez être membre de ce groupe actif.",
  );
  expect(await db("auth_user").where({ email: "revoked@example.org" })).toHaveLength(0);
  await page.reload();
  await expect(page.getByText("Vous n'appartenez à aucun groupe actif")).toBeVisible();
});
