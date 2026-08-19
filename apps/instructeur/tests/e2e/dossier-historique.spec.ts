import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("les actions sur le dossier alimentent l'onglet Historique", async ({ page, db, loginAs }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "claire.morin@dreal.fr",
    dossierNom: "Dossier historique e2e",
  });

  // A pétitionnaire action recorded by the DN synchronization.
  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "champ_modifie",
    data: JSON.stringify({ field: "Description" }),
    author_petitionnaire: true,
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}#instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  // Instructeur actions: field edits, a follow and a comment.
  await page.locator("#enjeu").selectOption("oui");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await page.getByRole("button", { name: "Suivre ce dossier" }).click();
  await expect(page.getByRole("button", { name: "Vous suivez ce dossier" })).toBeVisible();
  await page.getByLabel("Laissez un commentaire").fill("Commentaire pour l'historique.");
  await page.getByRole("button", { name: "Commenter" }).click();
  await expect(page.getByText("Commentaire pour l'historique.")).toBeVisible();

  await page.getByRole("tab", { name: "Historique" }).click();

  await expect(page.getByText("Dossier à enjeu renseigné :")).toBeVisible();
  await expect(page.getByText("Dossier suivi par")).toBeVisible();
  await expect(page.getByText("Commentaire ajouté :")).toBeVisible();
  await expect(page.getByText("Champ Description renseigné")).toBeVisible();
  await expect(page.getByText("par le pétitionnaire").first()).toBeVisible();
  // The dépôt milestone is derived from the dossier itself.
  await expect(page.getByText("Dossier déposé sur Démarches Numériques")).toBeVisible();
});
