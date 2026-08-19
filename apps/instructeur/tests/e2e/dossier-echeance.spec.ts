import { test, expect } from "../fixtures/playwright.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

const ECHEANCE_LABEL = "Date de la prochaine échéance";

test("l'échéance saisie sur le dossier est persistée, puis peut être vidée", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@echeance-dossier.fr",
    dossierNom: "Dossier échéance e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await page.getByLabel(ECHEANCE_LABEL).fill("15/09/2026");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByLabel(ECHEANCE_LABEL)).toHaveValue("15/09/2026");
  // The dossier header shows the échéance countdown tag.
  await expect(page.locator("main header")).toContainText(/Échéance J-\d+|Échéance jour J|Retard/);

  await page.getByLabel(ECHEANCE_LABEL).fill("");
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(page.getByLabel(ECHEANCE_LABEL)).toHaveValue("");
});

test("l'échéance se modifie depuis le menu d'une tuile et reste cohérente avec le dossier", async ({
  page,
  db,
  loginAs,
}) => {
  const {
    codeAcces,
    dossier,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@echeance-tuile.fr",
    dossierNom: "Dossier échéance depuis la liste",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);

  await loginAs(codeAcces);
  await page.goto("/mes-dossiers");
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  const card = page.getByTestId("card-dossier").filter({ hasText: dossier.name! });
  await card.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Modifier la date de la prochaine échéance" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(ECHEANCE_LABEL).fill("15/09/2026");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(dialog).toBeHidden();

  // The tile shows the échéance tag right away, without a reload.
  await expect(card.locator("p.fr-badge", { hasText: /Échéance|Retard/ })).toBeVisible();
  await page.waitForLoadState("networkidle");

  // The dossier page shows the date set from the tile.
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByLabel(ECHEANCE_LABEL)).toHaveValue("15/09/2026");
});

test("les dossiers se filtrent et se trient sur la date de prochaine échéance", async ({
  page,
  db,
  loginAs,
}) => {
  const {
    codeAcces,
    dossier,
    groupeId,
    id: personneId,
  } = await createInstructeurWithDossier(db, {
    email: "instr@echeance-tri.fr",
    dossierNom: "Dossier avec échéance",
  });
  await attachPersonneSuitDossier(db, personneId, dossier.id);
  await db("dossier").where({ id: dossier.id }).update({ next_due_date: "2026-09-15" });

  const withoutEcheance = await createDossier(db, { name: "Dossier sans échéance" });
  await attachDossierToGroupe(db, withoutEcheance.id, groupeId);
  await attachPersonneSuitDossier(db, personneId, withoutEcheance.id);

  await loginAs(codeAcces);

  // Sorting: the dossier without an échéance is pushed last, whatever the direction.
  await page.goto("/mes-dossiers?sort=nextDueDate&order=asc");
  await expect(page.getByTestId("card-dossier").first()).toContainText("Dossier avec échéance");
  await page.goto("/mes-dossiers?sort=nextDueDate&order=desc");
  await expect(page.getByTestId("card-dossier").first()).toContainText("Dossier avec échéance");

  // Filtering on the échéance range leaves out the dossier that has none.
  await page.goto("/mes-dossiers?dateField=nextDue&from=2026-09-01&to=2026-09-30");
  await expect(page.getByTestId("card-dossier")).toHaveCount(1);
  await expect(page.getByTestId("card-dossier")).toContainText("Dossier avec échéance");
});
