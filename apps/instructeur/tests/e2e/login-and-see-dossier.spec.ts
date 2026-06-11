import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'instructeur·rice se connecte via ?secret et voit son dossier", async ({ page, db }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await page.goto(`/?secret=${codeAcces}`);

  // Login lands on the home page, now "Mes dossiers"
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  // The dossier belongs to the instructeur's groupe but isn't followed, so it
  // shows on the Tableau de suivi page (which lists every groupe dossier)
  await page.goto("/tableau-de-suivi");
  await expect(page.getByRole("heading", { name: /Tableau de suivi/ })).toBeVisible();
  await expect(page.getByText(dossier.nom!)).toBeVisible();
});
