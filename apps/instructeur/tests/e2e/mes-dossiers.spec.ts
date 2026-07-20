import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/playwright.ts";
import {
  attachDossierToGroupe,
  createCapEvenementMetrique,
  createDossier,
  createDossierSearch,
  createInstructeurWithCapToGroup,
  DEFAULT_NUMERO_DEMARCHE,
} from "../factories/index.ts";
import { attachPersonneSuitDossier, createNotification } from "../factories/notification.ts";
import type { Knex } from "knex";

const CODE = "abyssin";

type SetupResult = {
  unviewedRecent: { id: number; name: string };
  unviewedOld: { id: number; name: string };
  viewedRecent: { id: number; name: string };
  noNotificationOld: { id: number; name: string };
};

async function setup(db: Knex): Promise<SetupResult> {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });

  // depot_date, from oldest to newest.
  const d1 = new Date("2024-01-01");
  const d2 = new Date("2024-02-01");
  const d3 = new Date("2024-03-01");
  const d4 = new Date("2024-04-01");

  const noNotificationOld = await createDossier(db, {
    name: "Dossier ancien sans notification",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: d1,
  });
  const viewedRecent = await createDossier(db, {
    name: "Dossier récent déjà consulté",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: d2,
  });
  const unviewedOld = await createDossier(db, {
    name: "Recherche scientifique sur les chats",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: d3,
  });
  const unviewedRecent = await createDossier(db, {
    name: "Parc photovoltaïque à Anglet",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: d4,
    enjeu: true,
  });

  for (const d of [noNotificationOld, viewedRecent, unviewedOld, unviewedRecent]) {
    await attachDossierToGroupe(db, d.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, d.id);
  }

  // notification dates: unviewedRecent newer than unviewedOld
  await createNotification(db, {
    personneId,
    dossierId: viewedRecent.id,
    vue: true,
    date: new Date("2024-05-01"),
  });
  await createNotification(db, {
    personneId,
    dossierId: unviewedOld.id,
    vue: false,
    date: new Date("2024-05-02"),
  });
  await createNotification(db, {
    personneId,
    dossierId: unviewedRecent.id,
    vue: false,
    date: new Date("2024-05-03"),
  });

  return {
    unviewedRecent: { id: unviewedRecent.id, name: unviewedRecent.name! },
    unviewedOld: { id: unviewedOld.id, name: unviewedOld.name! },
    viewedRecent: { id: viewedRecent.id, name: viewedRecent.name! },
    noNotificationOld: { id: noNotificationOld.id, name: noNotificationOld.name! },
  };
}

async function gotoMesDossiers(page: Page): Promise<void> {
  await page.goto(`/?secret=${CODE}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Tableau de suivi instruction DDEP",
  );
  await page.goto("/mes-dossiers");
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();
}

test("dossiers triés : notifications non vues (récentes d'abord) puis depot_date décroissante", async ({
  page,
  db,
}) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  // The counter names the instructeur's single service.
  await expect(page.getByTestId("compteur-dossier")).toContainText(
    "4 dossiers dans votre service : Groupe de test",
  );

  const cards = await page.getByTestId("card-dossier").all();
  const expectedOrder = [
    fixtures.unviewedRecent.name,
    fixtures.unviewedOld.name,
    fixtures.viewedRecent.name,
    fixtures.noNotificationOld.name,
  ];
  for (let i = 0; i < cards.length; i++) {
    await expect(cards[i]).toContainText(expectedOrder[i]);
  }
});

test("les dossiers avec notification non vue portent un badge Nouveauté", async ({ page, db }) => {
  await setup(db);
  await gotoMesDossiers(page);

  const withBadge = await page
    .getByTestId("card-dossier")
    .filter({ has: page.locator("p.fr-badge", { hasText: /Nouveauté/i }) })
    .all();

  expect(withBadge).toHaveLength(2);
});

test("le filtre Nouveauté ne montre que les dossiers à notification non vue", async ({
  page,
  db,
}) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  await page.getByRole("button", { name: "Filtres" }).click();
  const modal = page.getByRole("dialog", { name: "Tous les filtres" });
  await modal.locator('label[for="nouvelles-modifications"]').click();

  // Filters apply live: the URL and the background list update as soon as the box is ticked,
  // before « Rechercher » is pressed.
  await expect(page).toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("2 dossiers dans votre service");

  // The footer button reflects the live result count.
  await expect(modal.getByRole("button", { name: "Voir 2 résultats" })).toBeVisible();
  await modal.getByRole("button", { name: "Voir 2 résultats" }).click();

  // Closing the panel keeps the applied filter.
  await expect(page).toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("2 dossiers dans votre service");

  const cards = await page.getByTestId("card-dossier").all();
  const expectedOrder = [fixtures.unviewedRecent.name, fixtures.unviewedOld.name];
  for (let i = 0; i < cards.length; i++) {
    await expect(cards[i]).toContainText(expectedOrder[i]);
  }

  // The active filter shows as a removable tag; clicking it clears the filter.
  const tags = page.getByTestId("filtres-actifs");
  const nouveauteTag = tags.getByRole("button", { name: /Nouvelles modifications/ });
  await expect(nouveauteTag).toBeVisible();
  await nouveauteTag.click();

  await expect(page).not.toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("4 dossiers dans votre service");
  await expect(tags).toHaveCount(0);
});

test("le badge Nouveauté disparaît après consultation du dossier", async ({ page, db }) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  const title = page.getByRole("link", { name: fixtures.unviewedRecent.name });
  const card = page.getByTestId("card-dossier").filter({ has: title });
  const badge = card.locator("p.fr-badge", { hasText: /Nouveauté/i });

  await expect(card).toHaveCount(1);
  await expect(badge).toHaveCount(1);

  await title.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(fixtures.unviewedRecent.name);

  await page.goto("/mes-dossiers");
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  await expect(card).toHaveCount(1);
  await expect(badge).toHaveCount(0);
});

test("Le badge Dossier à enjeu apparaît lorsque le dossier possède un enjeu", async ({
  page,
  db,
}) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  const title = page.getByRole("link", { name: fixtures.unviewedRecent.name });
  const card = page.getByTestId("card-dossier").filter({ has: title });
  const badge = card.locator("p.fr-badge", { hasText: /Dossier à enjeu/i });

  await expect(card).toHaveCount(1);
  await expect(badge).toHaveCount(1);
});

test("la recherche filtre la liste au fil de la frappe, sans valider", async ({ page, db }) => {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });

  const photovoltaique = await createDossier(db, {
    name: "Parc photovoltaïque à Anglet",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    demarche_numerique_number: "29803745",
  });
  const coquelicots = await createDossier(db, {
    name: "Recherche scientifique",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    free_comment: "Présence de coquelicots sur la zone",
  });
  const methaniseur = await createDossier(db, {
    name: "Méthaniseur",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    demarche_numerique_number: "12345678",
  });

  for (const d of [photovoltaique, coquelicots, methaniseur]) {
    await attachDossierToGroupe(db, d.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, d.id);
  }

  await gotoMesDossiers(page);
  const cards = page.getByTestId("card-dossier");
  await expect(cards).toHaveCount(3);

  const searchInput = page.getByLabel("Rechercher un dossier");

  // A partial name updates the list and URL without submitting.
  await searchInput.fill("photovolta");
  await expect(page).toHaveURL(/[?&]q=photovolta/);
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Parc photovoltaïque à Anglet");

  // The free comment is searchable too.
  await searchInput.fill("coquelicot");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Recherche scientifique");

  // A partial DN number matches without requiring the full value.
  await searchInput.fill("298037");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Parc photovoltaïque à Anglet");

  // Clearing the input restores all dossiers.
  await searchInput.fill("");
  await expect(cards).toHaveCount(3);
});

test("la barre de recherche suggère les 3 dernières recherches distinctes", async ({
  page,
  db,
}) => {
  const {
    id: personneId,
    codeAcces,
    groupeId,
  } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });
  await createCapEvenementMetrique(db, codeAcces);

  const photovoltaique = await createDossier(db, {
    name: "Parc photovoltaïque à Anglet",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
  });
  const carriere = await createDossier(db, {
    name: "Carrière de calcaire",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
  });
  for (const d of [photovoltaique, carriere]) {
    await attachDossierToGroupe(db, d.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, d.id);
  }

  // Seeding directly avoids waiting on the 10s analytics debounce. « carrière » appears
  // twice: only its most recent occurrence counts, and distinct texts cap the list at 3.
  await createDossierSearch(db, { personneId, text: "carrière", date: new Date("2024-05-01") });
  await createDossierSearch(db, { personneId, text: "éolien", date: new Date("2024-05-02") });
  await createDossierSearch(db, { personneId, text: "carrière", date: new Date("2024-05-03") });
  await createDossierSearch(db, { personneId, text: "méthaniseur", date: new Date("2024-05-04") });
  await createDossierSearch(db, {
    personneId,
    text: "photovoltaïque",
    date: new Date("2024-05-05"),
  });

  await gotoMesDossiers(page);

  await page.getByLabel("Rechercher un dossier").focus();
  const suggestions = page.getByRole("listbox", { name: "Recherches récentes" });
  await expect(suggestions).toBeVisible();

  // The 3 most recent distinct searches, most recent first — « éolien » fell off.
  const options = suggestions.getByRole("option");
  await expect(options).toHaveText(["photovoltaïque", "méthaniseur", "carrière"]);

  // Clicking a suggestion re-runs that search: URL and list update.
  await options.nth(0).click();
  await expect(page).toHaveURL(/[?&]q=photovolta/);
  const cards = page.getByTestId("card-dossier");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Parc photovoltaïque à Anglet");
});

test("le filtre « Moi en charge de la prochaine action » remplace « à enjeux »", async ({
  page,
  db,
}) => {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });

  const instructeurAction = await createDossier(db, {
    name: "Parc photovoltaïque à Anglet",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    next_action_expected_from: "Instructeur",
  });
  const petitionnaireAction = await createDossier(db, {
    name: "Carrière de calcaire",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    next_action_expected_from: "Pétitionnaire",
  });
  for (const d of [instructeurAction, petitionnaireAction]) {
    await attachDossierToGroupe(db, d.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, d.id);
  }

  await gotoMesDossiers(page);

  // « à enjeux » is hidden on this page, replaced by the prochaine-action quick filter.
  await expect(page.getByRole("button", { name: "Dossiers à enjeux" })).toHaveCount(0);
  const button = page.getByRole("button", { name: "Moi en charge de la prochaine action" });
  await expect(button).toBeVisible();

  await button.click();
  await expect(page).toHaveURL(/actionInstructeur=1/);
  const cards = page.getByTestId("card-dossier");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Parc photovoltaïque à Anglet");

  // Toggling it off restores the full list.
  await button.click();
  await expect(page).not.toHaveURL(/actionInstructeur=1/);
  await expect(cards).toHaveCount(2);
});
