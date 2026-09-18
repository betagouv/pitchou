import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

test("toute la tuile ouvre le dossier, sauf ses propres commandes", async ({
  page,
  db,
  loginAs,
}) => {
  const {
    codeAcces,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@tuile.fr",
    dossierNom: "Dossier tuile cliquable e2e",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);

  await loginAs(codeAcces);
  await page.goto("/mes-dossiers");
  const card = page.getByTestId("card-dossier").filter({ hasText: dossier.name! });

  // The middle of the tile, far from the title, opens the dossier.
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/dossier/${dossier.id}`));
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  // The star keeps its own job: it stops following instead of navigating, which
  // takes the dossier out of « Mes dossiers ».
  await page.goto("/mes-dossiers");
  await card.getByRole("button", { name: "Ne plus suivre" }).click();
  await expect(page).toHaveURL(/\/mes-dossiers/);
  await expect(card).toHaveCount(0);
});

test("la tuile n'affiche plus de bouton de commentaire", async ({ page, db, loginAs }) => {
  const {
    codeAcces,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@tuile-commentaire.fr",
    // The name must not contain « commentaire »: the actions menu is labelled after
    // the dossier, and the assertion below matches accessible names by substring.
    dossierNom: "Dossier tuile sans bulle e2e",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);
  await db("commentaire").insert({ dossier: dossier.id, content: "Un commentaire d'instruction" });

  await loginAs(codeAcces);
  await page.goto("/mes-dossiers");
  const card = page.getByTestId("card-dossier").filter({ hasText: dossier.name! });
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Commentaire" })).toHaveCount(0);
});
