import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";

test("members find colleagues by name or email and can still add a new address", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const owner = await createInstructeurWithCapToGroup(db, {
    email: "owner@example.org",
    nomGroupe: "Bretagne",
  });
  await db("auth_user").insert({
    email: "celine@example.org",
    first_names: "Céline",
    last_name: "Leroy",
  });
  await db("auth_user").insert({
    email: "camille@example.org",
    first_names: "Camille",
    last_name: "Martin",
  });
  await loginAs(owner.codeAcces);
  await page.goto("/parametres/groupes");
  const group = page.getByRole("region", { name: "Bretagne", exact: true });
  const input = group.getByRole("combobox", {
    name: "Ajouter un membre par adresse professionnelle",
  });
  await input.fill("celine");
  await expect(
    group.getByRole("option", { name: "Céline Leroy celine@example.org" }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.frTheme = "dark";
  });
  await page.screenshot({ path: testInfo.outputPath("member-suggestions.png") });
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(input).toHaveValue("celine@example.org");
  await expect(group.getByRole("listbox")).toHaveCount(0);
  await expect(group.getByRole("button", { name: "Retirer celine@example.org" })).toHaveCount(0);
  await group.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(group.getByRole("button", { name: "Retirer celine@example.org" })).toBeVisible();

  await input.fill("camille@");
  await group.getByRole("option", { name: "Camille Martin camille@example.org" }).click();
  await expect(input).toHaveValue("camille@example.org");
  await input.fill("unknown@example.org");
  await expect(
    group.getByRole("status").filter({ hasText: "Aucun utilisateur trouvé" }),
  ).toBeVisible();
  await input.press("Escape");
  await expect(input).toHaveValue("unknown@example.org");
  await group.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(group.getByRole("button", { name: "Retirer unknown@example.org" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 });
  await input.fill("camille");
  await input.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(
    group.getByRole("option", { name: "Camille Martin camille@example.org" }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("member-suggestions-mobile.png") });
});
