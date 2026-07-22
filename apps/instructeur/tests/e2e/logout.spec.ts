import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("se déconnecter renvoie vers la page de connexion", async ({ page, db }) => {
  const { codeAcces } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  // Login via ?secret lands on the home page, which is now "Mes dossiers"
  await page.goto(`/?secret=${codeAcces}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  // Sign out from the account menu
  await page.getByRole("button", { name: "Mon espace" }).click();
  await page.getByRole("button", { name: "Se déconnecter" }).click();

  // Signing out must land on the sign-in page without needing a manual reload
  await expect(page.getByRole("heading", { level: 1, name: "Connexion à Pitchou" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/connexion");
});
