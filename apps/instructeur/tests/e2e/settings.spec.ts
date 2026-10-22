import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";

test("settings sections have direct links and appearance follows the shared browser preference", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const owner = await createInstructeurWithCapToGroup(db, { nomGroupe: "Bretagne" });
  const colleague = await createInstructeurWithCapToGroup(db, { nomGroupe: "Normandie" });
  await db("user_groupe").insert({ user_id: owner.id, groupe_instructeurs: colleague.groupeId });
  await loginAs(owner.codeAcces);
  await page.goto("/parametres");
  const arrivals = page.getByRole("group", {
    name: "Nouveaux dossiers dans mon groupe instructeur",
  });
  await expect(arrivals.getByRole("radio", { name: "Activé", exact: true })).toBeChecked();
  await arrivals.getByText("Désactivé", { exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Vos paramètres ont été enregistrés.");
  await page.reload();
  await expect(arrivals.getByRole("radio", { name: "Désactivé", exact: true })).toBeChecked();
  await page.getByText("Sombre", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-fr-theme", "dark");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("scheme"))).toBe("dark");
  await page.reload();
  await expect(page.getByRole("radio", { name: /^Sombre/u })).toBeChecked();
  await page.locator("main").screenshot({ path: testInfo.outputPath("settings-general-dark.png") });

  await page.getByRole("button", { name: "Mon espace" }).click();
  await page.getByRole("button", { name: "Thème clair", exact: true }).click();
  await expect(page.getByRole("radio", { name: /^Clair/u })).toBeChecked();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("radio", { name: /^Automatique/u }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-fr-scheme", "system");
  await expect(page.locator("html")).toHaveAttribute("data-fr-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-fr-theme", "light");

  const groupsLink = page.getByRole("link", { name: /Mes groupes/u });
  await groupsLink.click();
  await expect(page).toHaveURL(/\/parametres\/groupes$/u);
  await expect(groupsLink).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Bretagne", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Bretagne", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Normandie", exact: true })).toBeVisible();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-fr-theme", "dark");
  await page.locator("main").screenshot({ path: testInfo.outputPath("settings-groups-dark.png") });
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Général", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const section = page.getByRole("combobox", { name: "Rubrique des paramètres" });
  await section.click();
  await page.getByRole("option", { name: "Mes groupes", exact: true }).click();
  await expect(page).toHaveURL(/\/parametres\/groupes$/u);
  await expect(page.getByRole("region", { name: "Bretagne", exact: true })).toBeVisible();
  await section.click();
  await page.getByRole("option", { name: "Général", exact: true }).click();
  await page.getByText("Sombre", { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator("main").screenshot({
    path: testInfo.outputPath("settings-general-mobile.png"),
  });
});
