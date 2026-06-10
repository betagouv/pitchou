import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'accès direct à /dossier/[id] (équivalent reload) ne déclenche pas une 500", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Dossier test reload",
  });
  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);

  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();
});

test("recharger /dossier/[id] ne déclenche pas une 500", async ({ page, db }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "jane@doe.fr",
    dossierNom: "Dossier test reload bis",
  });

  // Log in via the URL (the working path), then reload to reproduce the bug.
  await page.goto(`/?secret=${codeAcces}`);
  await expect(page.getByRole("heading", { name: /Tableau de suivi/ })).toBeVisible();

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();
});
