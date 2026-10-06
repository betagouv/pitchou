import { readFile } from "node:fs/promises";
import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("page help and AARRI downloads live in the header", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  await loginAs(admin.codeAcces);
  await page.emulateMedia({ colorScheme: "dark" });
  for (const [path, title, text] of [
    [
      "utilisateurs",
      "Utilisateurs",
      "Les comptes apparaissent à leur première connexion ProConnect.",
    ],
    [
      "groupes-instructeurs",
      "Groupes instructeurs",
      "Chaque dossier appartient à tous les groupes actifs",
    ],
    ["activites", "Activités et libellés", "Ces libellés sont rattachés à une"],
    ["aarri", "Niveaux AARRI", "Le niveau AARRI résume"],
  ]) {
    await page.goto(E2E_ADMIN_BASE_URL + "/" + path);
    const help = page
      .locator("header")
      .getByRole("button", { name: `Aide : ${title}`, exact: true });
    await expect(help).toBeVisible();
    await expect(page.getByText(text, { exact: false })).toHaveCount(0);
    await help.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toContainText(text);
    await expect(dialog.getByRole("button", { name: "Fermer", exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: "Fermer l'aide", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(help).toBeFocused();
  }
  const download = page.locator("header").getByRole("button", { name: "Télécharger", exact: true });
  await download.focus();
  await page.keyboard.press("ArrowDown");
  const users = page.getByRole("menuitem", { name: "Liste des utilisateurs (CSV)", exact: true });
  await expect(users).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("aarri-header-menu-dark.png") });
  let downloaded = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const usersFile = await downloaded;
  expect(usersFile.suggestedFilename()).toMatch(/^instructrices_aarri_.*\.csv$/);
  expect(await readFile((await usersFile.path())!, "utf8")).toContain("admin@example.org");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await download.click();
  await page.keyboard.press("ArrowDown");
  const events = page.getByRole("menuitem", { name: "Évènements (CSV)", exact: true });
  await expect(events).toBeFocused();
  downloaded = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const eventsFile = await downloaded;
  expect(eventsFile.suggestedFilename()).toMatch(/^evenements_metriques_.*\.csv$/);
  expect(await readFile((await eventsFile.path())!, "utf8")).toContain(
    "email,groupes instructeurs,date,évènement,détails",
  );
  await page.setViewportSize({ width: 390, height: 640 });
  await download.click();
  await expect(events).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(download).toBeFocused();
  await page.getByRole("button", { name: "Aide : Niveaux AARRI" }).click();
  await expect(page.getByRole("button", { name: "Fermer l'aide" })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("aarri-help-mobile-dark.png") });
  await page.getByRole("button", { name: "Fermer l'aide" }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  const icon = page
    .getByRole("link", { name: "Suivi AARRI", exact: true })
    .locator('[class*="fr-icon-"]');
  const mask = await icon.evaluate((element) => getComputedStyle(element, "::before").maskImage);
  expect(mask).toContain("bar-chart-box-line.svg");
  await page.getByRole("link", { name: "Dossiers", exact: true }).click();
  await expect(download).toHaveCount(0);
  await expect(page.locator("header").getByRole("button", { name: /^Aide :/ })).toHaveCount(0);
});
