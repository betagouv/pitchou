import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("les commentaires du dossier s'ajoutent, se modifient et persistent", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "vanessa.rispal@dreal.fr",
    dossierNom: "Dossier commentaires e2e",
  });

  // The comment migrated from the former free comment, without an author.
  await db("commentaire").insert({
    dossier: dossier.id,
    personne: null,
    content: "Ancien commentaire libre du dossier.",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}#instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  // The migrated comment is shown as written by "initial" before 09/2026.
  await expect(page.getByText("Ancien commentaire libre du dossier.")).toBeVisible();
  await expect(page.getByText("initial", { exact: true })).toBeVisible();
  await expect(page.getByText("avant 09/2026")).toBeVisible();

  // A new comment is signed with the name part of the email and persists.
  await page.getByLabel("Laissez un commentaire").fill("Premier retour sur ce dossier.");
  await page.getByRole("button", { name: "Commenter" }).click();
  await expect(page.getByText("Premier retour sur ce dossier.")).toBeVisible();
  await expect(page.getByText("vanessa.rispal", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Premier retour sur ce dossier.")).toBeVisible();

  // The author can edit their comment; the edit persists.
  await page.getByRole("button", { name: "Modifier le commentaire" }).click();
  await page.getByLabel("Modifier le commentaire").fill("Retour corrigé sur ce dossier.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Retour corrigé sur ce dossier.")).toBeVisible();
  await expect(page.getByText(/modifié le/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Retour corrigé sur ce dossier.")).toBeVisible();
});
