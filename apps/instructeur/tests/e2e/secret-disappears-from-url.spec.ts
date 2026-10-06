import { loginBrowser } from "../helpers/browserAuth.ts";
import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("la session permet une connexion sans secret dans l'URL", async ({ page, db }) => {
  const { codeAcces } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Projet de test",
  });

  await loginBrowser(page, db, codeAcces);

  // Login lands on the home page, now "Mes dossiers"
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  await expect.poll(() => new URL(page.url()).searchParams.get("secret")).toBeNull();
});
