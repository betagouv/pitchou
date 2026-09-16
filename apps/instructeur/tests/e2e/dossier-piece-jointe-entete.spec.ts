import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

// The header entry point lives in the "…" actions menu, whose items are not DSFR trigger
// buttons: the modal is opened through the DSFR script instead. Only the real DSFR script
// can tell whether that works, hence an end-to-end test rather than a component one.
test("le menu d'actions de l'entête ouvre la modale d'ajout de pièce jointe", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@piece-jointe.fr",
    dossierNom: "Dossier pièce jointe e2e",
  });
  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  const dialog = page.locator("#modale-ajouter-piece-jointe-entete");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Ajouter une pièce jointe" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Ajouter une pièce jointe" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "Décision administrative" })).toBeVisible();

  await dialog.getByRole("button", { name: "Fermer" }).click();
  await expect(dialog).toBeHidden();

  // Opening it a second time must work too: the menu items are recreated at each opening.
  await page.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Ajouter une pièce jointe" }).click();
  await expect(dialog).toBeVisible();
});
