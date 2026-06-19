import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'instructeurice saisit les dates de consultation du public et elles sont persistées", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@consultation.fr",
    dossierNom: "Dossier consultation public e2e",
  });
  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await page.getByLabel("Date de début").fill("2025-03-10");
  await page.getByLabel("Date de fin").fill("2025-04-30");

  await expect
    .poll(async () => {
      const row = await db("dossier").where({ id: dossier.id }).first();
      return (
        row.date_debut_consultation_public !== null && row.date_fin_consultation_public !== null
      );
    })
    .toBe(true);

  const row = await db("dossier").where({ id: dossier.id }).first();
  expect(new Date(row.date_debut_consultation_public).toISOString().slice(0, 10)).toBe(
    "2025-03-10",
  );
  expect(new Date(row.date_fin_consultation_public).toISOString().slice(0, 10)).toBe("2025-04-30");
});

test("les dates de consultation sont pré-remplies si déjà renseignées", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@consultation2.fr",
    dossierNom: "Dossier consultation pré-rempli e2e",
  });

  await db("dossier")
    .where({ id: dossier.id })
    .update({
      date_debut_consultation_public: new Date("2024-06-01"),
      date_fin_consultation_public: new Date("2024-07-15"),
    });

  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await expect(page.getByLabel("Date de début")).toHaveValue("2024-06-01");
  await expect(page.getByLabel("Date de fin")).toHaveValue("2024-07-15");
});
