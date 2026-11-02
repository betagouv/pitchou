import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";

test("members manage their group from settings, including first-login accounts and leaving", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const owner = await createInstructeurWithCapToGroup(db, {
    email: "owner@example.org",
    nomGroupe: "DREAL Bretagne",
  });
  await loginAs(owner.codeAcces);
  await page.goto("/mes-dossiers");
  await page.getByRole("button", { name: "Mon espace" }).click();
  await page.getByRole("link", { name: "Paramètres" }).click();
  await expect(page).toHaveURL(/\/parametres$/u);
  await page.getByRole("link", { name: /Mes groupes/u }).click();
  const group = page.getByRole("region", { name: "DREAL Bretagne", exact: true });
  await expect(group.getByText("owner@example.org (vous)", { exact: true })).toBeVisible();
  await group.getByLabel("Ajouter un membre par adresse professionnelle").fill("new@example.org");
  await group.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(group.getByRole("button", { name: "Retirer new@example.org" })).toBeVisible();
  const user = await db("auth_user").where({ email: "new@example.org" }).first();
  expect(await db("auth_permission_bundle").where({ user_id: user.id }).pluck("bundle")).toEqual([
    "instructeur",
  ]);
  await group.getByRole("button", { name: "Retirer new@example.org" }).click();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(group.getByRole("button", { name: "Retirer new@example.org" })).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => {
      document.documentElement.dataset.frTheme = "dark";
    });
    await group.getByRole("button", { name: "Retirer new@example.org" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Confirmer le retrait" })).toBeInViewport();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThan(0);
    expect(bounds!.y).toBeGreaterThan(0);
    expect(Math.abs(bounds!.x + bounds!.width / 2 - width / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`group-removal-${width}.png`) });
    await page.keyboard.press("Escape");
  }
  await group.getByRole("button", { name: "Retirer new@example.org" }).click();
  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(group.getByRole("button", { name: "Retirer new@example.org" })).toHaveCount(0);
  await group.getByRole("button", { name: "Quitter le groupe", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Ce groupe n'aura plus de membre actif.");
  await dialog.getByRole("button", { name: "Quitter le groupe", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vous n'appartenez à aucun groupe actif" }),
  ).toBeVisible();
  expect(await db("user_groupe").where({ groupe_instructeurs: owner.groupeId })).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath("settings-no-groups.png") });
});

test("membership search and pagination work across multiple groups", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const owner = await createInstructeurWithCapToGroup(db, {
    email: "owner@example.org",
    nomGroupe: "Bretagne",
  });
  const second = await createInstructeurWithCapToGroup(db, {
    email: "second@example.org",
    nomGroupe: "Normandie",
  });
  await db("user_groupe").insert({ user_id: owner.id, groupe_instructeurs: second.groupeId });
  const users = await db("auth_user")
    .insert(
      Array.from({ length: 12 }, (_, i) => ({
        email: `colleague${String(i).padStart(2, "0")}@example.org`,
      })),
    )
    .returning("id");
  await db("user_groupe").insert(
    users.map((u) => ({ user_id: u.id, groupe_instructeurs: owner.groupeId })),
  );
  await loginAs(owner.codeAcces);
  await page.goto("/parametres/groupes");
  const group = page.getByRole("region", { name: "Bretagne", exact: true });
  await expect(group.getByText("Page 1 sur 2")).toBeVisible();
  await group.getByRole("button", { name: "Suivant" }).click();
  await expect(group.getByText("Page 2 sur 2")).toBeVisible();
  await group.getByRole("searchbox", { name: "Rechercher un membre" }).fill("colleague00");
  await expect(
    group.getByRole("button", { name: "Retirer colleague00@example.org" }),
  ).toBeVisible();
  await expect(group.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Normandie", exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset.frTheme = "dark";
  });
  await page.screenshot({ path: testInfo.outputPath("group-settings-dark.png"), fullPage: true });
});
