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
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await page.getByLabel("Date de début").fill("2025-03-10");
  await page.getByLabel("Date de fin").fill("2025-04-30");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await expect(page.getByLabel("Date de début")).toHaveValue("2025-03-10");
  await expect(page.getByLabel("Date de fin")).toHaveValue("2025-04-30");
});
