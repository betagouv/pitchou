import { loginBrowser } from "../helpers/browserAuth.ts";
import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'instructeur·rice se connecte via ?secret et voit son dossier", async ({ page, db }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await loginBrowser(page, db, codeAcces);

  // Login lands on the home page, now "Mes dossiers"
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  await expect(page.locator("header").getByRole("link", { name: "Tableau de suivi" })).toHaveCount(
    0,
  );

  // The dossier belongs to the instructeur's groupe but isn't followed, so it
  // shows on the Tous les dossiers page
  await page.goto("/tous-les-dossiers");
  await expect(page.getByRole("heading", { name: "Tous les dossiers" })).toBeVisible();
  await expect(page.getByText(dossier.name!)).toBeVisible();

  const removedPage = await page.goto("/tableau-de-suivi");
  expect(removedPage?.status()).toBe(404);
});
