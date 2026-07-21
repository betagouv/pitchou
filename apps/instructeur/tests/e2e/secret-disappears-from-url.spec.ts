import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("le paramètre ?secret est retiré de l'URL après connexion", async ({ page, db }) => {
  const { codeAcces } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await page.goto(`/?secret=${codeAcces}`);

  // Login lands on the home page, now "Mes dossiers"
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  await expect.poll(() => new URL(page.url()).searchParams.get("secret")).toBeNull();
});
