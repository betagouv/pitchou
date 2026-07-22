import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'instructeurice saisit les dates de consultation du public et elles sont persistées", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@consultation2.fr",
    dossierNom: "Dossier consultation pré-rempli e2e",
  });

  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await page.getByLabel("Date de début").fill("10/03/2025");
  await page.getByLabel("Date de fin").fill("30/04/2025");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.getByLabel("Date de début")).toHaveValue("10/03/2025");
  await expect(page.getByLabel("Date de fin")).toHaveValue("30/04/2025");
});

test("The 'Dossier à enjeu' toggle is disabled by default if the file is not a stakeholder file", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@enjeu-default.fr",
    dossierNom: "Dossier sans enjeu e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.locator("#toggle-enjeu")).not.toBeChecked();
});

test("Clicking the'Dossier à enjeu' toggle changes the stake value of the case, and when reloading, this modified value persists.", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@enjeu-click.fr",
    dossierNom: "Dossier enjeu à modifier e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.locator("#toggle-enjeu")).not.toBeChecked();
  await page.locator('label[for="toggle-enjeu"]').click();
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.locator("#toggle-enjeu")).toBeChecked();
});
