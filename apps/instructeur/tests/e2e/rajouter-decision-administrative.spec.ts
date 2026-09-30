import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { chooseInSelect } from "../helpers/select.ts";

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
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await page.getByRole("tab", { name: "Contrôle" }).click();
  await page.getByRole("button", { name: "Rajouter une décision administrative" }).click();

  await page.getByLabel("Numéro").fill("AP-E2E-001");
  await chooseInSelect(page.locator("#select-type"), "Arrêté de dérogation/AE");
  await page
    .getByLabel("Date de signature de la décision administrative", { exact: true })
    .fill("15/04/2026");
  await page.getByLabel("Date de fin des obligations", { exact: true }).fill("15/04/2031");
  await page.getByRole("button", { name: "Sauvegarder" }).click();
  expect(await db("decision_administrative").where({ dossier: dossier.id })).toHaveLength(0);
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
      const rows = await db("decision_administrative").where({ dossier: dossier.id });
      return rows.length;
    })
    .toBe(1);

  const decision = await db("decision_administrative").where({ dossier: dossier.id }).first();
  expect(decision.number).toBe("AP-E2E-001");
  expect(decision.type).toBe("Arrêté dérogation");
  expect(decision.fichier).not.toBeNull();

  await page.getByRole("tab", { name: "Pièces jointes" }).click();
  await page.getByRole("button", { name: "Supprimer arrete.pdf", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Voulez-vous supprimer arrete.pdf ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect(page.getByRole("link", { name: /arrete.pdf/ })).toHaveCount(0);
  expect(await db("decision_administrative").where({ id: decision.id }).first()).toMatchObject({
    number: "AP-E2E-001",
    fichier: null,
  });
});
