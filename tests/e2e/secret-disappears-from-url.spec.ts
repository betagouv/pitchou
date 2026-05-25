import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("le paramètre ?secret est retiré de l'URL après connexion", async ({ page, db }) => {
  const { codeAcces } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await page.goto(`/?secret=${codeAcces}`);

  await expect(page.getByRole("heading", { name: /Tableau de suivi/ })).toBeVisible();

  await expect.poll(() => new URL(page.url()).searchParams.get("secret")).toBeNull();
});
