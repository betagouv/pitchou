import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("rajouter une décision administrative l'ajoute à la liste du dossier", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@decision.fr",
    dossierNom: "Dossier décision e2e",
  });
  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await page.getByRole("tab", { name: "Controles" }).click();
  await page.getByRole("button", { name: "Rajouter une décision administrative" }).click();

  await page.getByLabel("Numéro").fill("AP-E2E-001");
  await page.getByLabel("Type de décision").selectOption("Arrêté dérogation");
  await page.getByLabel("Fichier de la décision administrative").setInputFiles({
    name: "arrete.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 e2e decision"),
  });

  await page.getByRole("button", { name: "Sauvegarder" }).click();

  // The décision appears in the list (outside the form), identified by its numéro.
  await expect(page.getByRole("heading", { name: /AP-E2E-001/ })).toBeVisible();

  // And it is properly persisted in the database with its file.
  await expect
    .poll(async () => {
      const rows = await db("décision_administrative").where({ dossier: dossier.id });
      return rows.length;
    })
    .toBe(1);

  const decision = await db("décision_administrative").where({ dossier: dossier.id }).first();
  expect(decision.numéro).toBe("AP-E2E-001");
  expect(decision.type).toBe("Arrêté dérogation");
  expect(decision.fichier).not.toBeNull();
});
