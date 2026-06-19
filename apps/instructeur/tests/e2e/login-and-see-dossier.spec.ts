import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'instructeur·rice se connecte via ?secret et voit son dossier", async ({ page, db }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await page.goto(`/?secret=${codeAcces}`);

  await expect(page.getByRole("heading", { name: /Tableau de suivi/ })).toBeVisible();
  await expect(page.getByText(dossier.nom!)).toBeVisible();
});
