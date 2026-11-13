import { test, expect } from "../fixtures/playwright.ts";
import { gotoMesDossiers, setupMesDossiers } from "./mesDossiersFixtures.ts";

test("les deux listes retrouvent leurs filtres via le menu et dans un nouvel onglet", async ({
  page,
  db,
  context,
}) => {
  await setupMesDossiers(db);
  await gotoMesDossiers(page, db);
  await page.getByRole("button", { name: "Modifications non lues", exact: true }).click();
  await expect(page).toHaveURL(/nouveaute=oui/u);
  await expect(page.getByTestId("card-dossier")).toHaveCount(2);

  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await menu.getByRole("link", { name: "Tous les dossiers", exact: true }).click();
  await expect(page).not.toHaveURL(/nouveaute/u);
  await page.getByRole("button", { name: "Dossiers à enjeux", exact: true }).click();
  await expect(page).toHaveURL(/enjeu=1/u);
  await expect(page.getByTestId("card-dossier")).toHaveCount(1);

  await menu.getByRole("link", { name: "Mes dossiers", exact: true }).click();
  await expect(page).toHaveURL(/nouveaute=oui/u);
  await expect(page.getByTestId("card-dossier")).toHaveCount(2);
  await menu.getByRole("link", { name: "Tous les dossiers", exact: true }).click();
  await expect(page).toHaveURL(/enjeu=1/u);
  await expect(page.getByTestId("card-dossier")).toHaveCount(1);

  const newTab = await context.newPage();
  await newTab.goto("/mes-dossiers");
  await expect(newTab).toHaveURL(/nouveaute=oui/u);
  await expect(newTab.getByTestId("card-dossier")).toHaveCount(2);
  await newTab.reload();
  await expect(newTab.getByTestId("card-dossier")).toHaveCount(2);
  await newTab.close();

  // Explicit links replace saved filters, and removing the last filter stays cleared.
  await page.goto("/tous-les-dossiers?q=scientifique");
  await expect(page.getByTestId("card-dossier")).toHaveCount(1);
  await expect(page.getByTestId("card-dossier")).toContainText("Recherche scientifique");
  await page.getByLabel("Rechercher un dossier").fill("");
  await expect(page.getByTestId("card-dossier")).toHaveCount(4);
  await menu.getByRole("link", { name: "Mes dossiers", exact: true }).click();
  await expect(page).toHaveURL(/nouveaute=oui/u);
  await menu.getByRole("link", { name: "Tous les dossiers", exact: true }).click();
  await expect(page.getByTestId("card-dossier")).toHaveCount(4);
  await expect(page).toHaveURL(/\/tous-les-dossiers$/u);
});
