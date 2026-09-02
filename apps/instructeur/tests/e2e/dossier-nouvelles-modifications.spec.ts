import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

function petitionnaireAction(dossier: number, type: string, data: Record<string, unknown>) {
  return {
    dossier,
    type,
    data: JSON.stringify(data),
    author_petitionnaire: true,
  };
}

test("les modifications du pétitionnaire non lues affichent des badges dans le détail du projet", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@nouvelles-modifs.fr",
    dossierNom: "Dossier badges modifications e2e",
  });
  await db("action_dossier").insert([
    petitionnaireAction(dossier.id, "champ_modifie", { field: "Description" }),
    petitionnaireAction(dossier.id, "especes_renseignees", {}),
    petitionnaireAction(dossier.id, "piece_jointe_importee", { name: "plan.pdf" }),
  ]);

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  const badges = page.getByText("Nouvelles modifications", { exact: true });
  await expect(badges).toHaveCount(3);

  await page.getByRole("button", { name: /Informations du projet/ }).click();
  await expect(page.getByText(/^Modifié le \d{2}\/\d{2}\/\d{4}$/).first()).toBeVisible();
});

test("les modifications déjà lues n'affichent pas de badge", async ({ page, db, loginAs }) => {
  const instructeur = await createInstructeurWithDossier(db, {
    email: "instr@modifs-lues.fr",
    dossierNom: "Dossier modifications lues e2e",
  });
  const { codeAcces, dossier } = instructeur;
  await db("action_dossier").insert([
    petitionnaireAction(dossier.id, "champ_modifie", { field: "Description" }),
  ]);
  // The instructeur read the dossier after the modification arrived.
  await db("notification").insert({
    dossier: dossier.id,
    personne: instructeur.id,
    viewed: true,
    viewed_at: new Date(Date.now() + 60_000),
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.getByRole("button", { name: /Informations du projet/ })).toBeVisible();

  await expect(page.getByText("Nouvelles modifications", { exact: true })).toHaveCount(0);
});
