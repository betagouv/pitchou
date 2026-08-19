import { test, expect } from "../fixtures/playwright.ts";
import {
  attachDossierToGroupe,
  createCapEvenementMetrique,
  createDossier,
  createDossierSearch,
  createInstructeurWithCapToGroup,
  DEFAULT_NUMERO_DEMARCHE,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";
import { gotoMesDossiers, MES_DOSSIERS_CODE } from "./mesDossiersFixtures.ts";

async function setupDossiers(
  db: Parameters<typeof createDossier>[0],
  dossiers: Parameters<typeof createDossier>[1][],
) {
  const instructeur = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: MES_DOSSIERS_CODE,
  });
  const created = [];
  for (const values of dossiers) {
    const dossier = await createDossier(db, {
      demarche_number: DEFAULT_NUMERO_DEMARCHE,
      ...values,
    });
    await attachDossierToGroupe(db, dossier.id, instructeur.groupeId);
    await attachPersonneSuitDossier(db, instructeur.id, dossier.id);
    created.push(dossier);
  }
  return { ...instructeur, dossiers: created };
}

test("la recherche filtre la liste au fil de la frappe, sans valider", async ({ page, db }) => {
  const setup = await setupDossiers(db, [
    { name: "Parc photovoltaïque à Anglet", demarche_numerique_number: "29803745" },
    { name: "Recherche scientifique" },
    { name: "Méthaniseur", demarche_numerique_number: "12345678" },
  ]);
  // The search covers the dossier's most recent commentaire.
  await db("commentaire").insert({
    dossier: setup.dossiers[1].id,
    content: "Présence de coquelicots sur la zone",
  });
  await gotoMesDossiers(page);
  const cards = page.getByTestId("card-dossier");
  const searchInput = page.getByLabel("Rechercher un dossier");
  await expect(cards).toHaveCount(3);
  for (const [search, expected] of [
    ["photovolta", "Parc photovoltaïque à Anglet"],
    ["coquelicot", "Recherche scientifique"],
    ["298037", "Parc photovoltaïque à Anglet"],
  ]) {
    await searchInput.fill(search);
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(expected);
  }
  await searchInput.fill("");
  await expect(cards).toHaveCount(3);
});

test("la barre de recherche suggère les 3 dernières recherches distinctes", async ({
  page,
  db,
}) => {
  const setup = await setupDossiers(db, [
    { name: "Parc photovoltaïque à Anglet" },
    { name: "Carrière de calcaire" },
  ]);
  await createCapEvenementMetrique(db, setup.codeAcces);
  for (const [text, date] of [
    ["carrière", "2024-05-01"],
    ["éolien", "2024-05-02"],
    ["carrière", "2024-05-03"],
    ["méthaniseur", "2024-05-04"],
    ["photovoltaïque", "2024-05-05"],
  ] as const) {
    await createDossierSearch(db, { personneId: setup.id, text, date: new Date(date) });
  }
  await gotoMesDossiers(page);
  await page.getByLabel("Rechercher un dossier").focus();
  const options = page.getByRole("listbox", { name: "Recherches récentes" }).getByRole("option");
  await expect(options).toHaveText(["photovoltaïque", "méthaniseur", "carrière"]);
  await options.nth(0).click();
  await expect(page.getByTestId("card-dossier")).toContainText("Parc photovoltaïque à Anglet");
});

test("le filtre Dossiers où je dois agir remplace à enjeux", async ({ page, db }) => {
  await setupDossiers(db, [
    { name: "Parc photovoltaïque à Anglet", next_action_expected_from: "Instructeur" },
    { name: "Carrière de calcaire", next_action_expected_from: "Pétitionnaire" },
  ]);
  await gotoMesDossiers(page);
  await expect(page.getByRole("button", { name: "Dossiers à enjeux" })).toHaveCount(0);
  const button = page.getByRole("button", { name: "Dossiers où je dois agir", exact: true });
  await button.click();
  await expect(page).toHaveURL(/actionInstructeur=1/);
  await expect(page.getByTestId("card-dossier")).toContainText("Parc photovoltaïque à Anglet");
  await button.click();
  await expect(page.getByTestId("card-dossier")).toHaveCount(2);
});
