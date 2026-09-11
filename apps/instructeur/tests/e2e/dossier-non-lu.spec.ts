import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

test("arrivée et suivi disparaissent après cinq secondes sans validation automatique des champs", async ({
  page,
  db,
  loginAs,
}) => {
  const {
    codeAcces,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@non-lu.fr",
    dossierNom: "Dossier non lu e2e",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);
  await db("action_dossier").insert({
    dossier: dossier.id,
    type: "champ_modifie",
    author_petitionnaire: true,
    data: JSON.stringify({ field: "Description", column: "description", notification: true }),
  });
  await loginAs(codeAcces);
  await page.goto("/mes-dossiers");
  const card = page.getByTestId("card-dossier").filter({ hasText: dossier.name! });
  await expect(card.getByText("Nouveau dossier", { exact: true })).toBeVisible();
  await expect(card.getByText("Nouveau suivi", { exact: true })).toHaveCount(0);
  await expect(card.getByText(/^Modifié/)).toHaveCount(0);
  await page.goto(`/dossier/${dossier.id}?tab=detail-du-projet`);
  const projectTab = page.getByRole("tab", { name: "Détail du projet", exact: true });
  await expect(projectTab).toHaveAccessibleDescription("Modifications non lues");
  await expect(page.getByText("Nouveau dossier", { exact: true })).toBeVisible();
  await expect(page.getByText("Nouveau suivi", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Nouveau dossier", { exact: true })).toHaveCount(0, {
    timeout: 10000,
  });
  await expect(page.getByText("Nouveau suivi", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/^Modifié (aujourd'hui|il y a)/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Marquer le dossier comme/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Informations du projet/ }).click();
  await page.getByRole("button", { name: "Valider la modification : Description" }).click();
  await expect(page.getByText(/^Modifié (aujourd'hui|il y a)/)).toHaveCount(0);
  await expect(projectTab).not.toHaveAccessibleDescription("Modifications non lues");
  await page.goto("/mes-dossiers");
  await expect(card).toBeVisible();
  await expect(card.getByText(/^(Nouveau dossier|Nouveau suivi|Modifié)/)).toHaveCount(0);
});
