import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/playwright.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createInstructeurWithCapToGroup,
  DEFAULT_NUMERO_DEMARCHE,
} from "../factories/index.ts";
import { attachPersonneSuitDossier, createNotification } from "../factories/notification.ts";
import type { Knex } from "knex";

const CODE = "abyssin";

type SetupResult = {
  unviewedRecent: { id: number; nom: string };
  unviewedOld: { id: number; nom: string };
  viewedRecent: { id: number; nom: string };
  noNotificationOld: { id: number; nom: string };
};

async function setup(db: Knex): Promise<SetupResult> {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });

  // date_dépôt — older to newer
  const d1 = new Date("2024-01-01");
  const d2 = new Date("2024-02-01");
  const d3 = new Date("2024-03-01");
  const d4 = new Date("2024-04-01");

  const noNotificationOld = await createDossier(db, {
    nom: "Dossier ancien sans notification",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    date_dépôt: d1,
  });
  const viewedRecent = await createDossier(db, {
    nom: "Dossier récent déjà consulté",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    date_dépôt: d2,
  });
  const unviewedOld = await createDossier(db, {
    nom: "Recherche scientifique sur les chats",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    date_dépôt: d3,
  });
  const unviewedRecent = await createDossier(db, {
    nom: "Parc photovoltaïque à Anglet",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    date_dépôt: d4,
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
    unviewedRecent: { id: unviewedRecent.id, nom: unviewedRecent.nom! },
    unviewedOld: { id: unviewedOld.id, nom: unviewedOld.nom! },
    viewedRecent: { id: viewedRecent.id, nom: viewedRecent.nom! },
    noNotificationOld: { id: noNotificationOld.id, nom: noNotificationOld.nom! },
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

test("dossiers triés par date de dépôt décroissante par défaut", async ({ page, db }) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  // The counter names the instructeur's single service.
  await expect(page.getByTestId("compteur-dossier")).toContainText(
    "4 dossiers dans votre service : Groupe de test",
  );

  const cartes = await page.getByTestId("carte-dossier").all();
  const ordreAttendu = [
    fixtures.unviewedRecent.nom,
    fixtures.unviewedOld.nom,
    fixtures.viewedRecent.nom,
    fixtures.noNotificationOld.nom,
  ];
  for (let i = 0; i < cartes.length; i++) {
    await expect(cartes[i]).toContainText(ordreAttendu[i]);
  }
});

test("les dossiers avec notification non vue portent un badge Nouveauté", async ({ page, db }) => {
  await setup(db);
  await gotoMesDossiers(page);

  const avecBadge = await page
    .getByTestId("carte-dossier")
    .filter({ has: page.locator("p.fr-badge", { hasText: /Nouveauté/i }) })
    .all();

  expect(avecBadge).toHaveLength(2);
});

test("le filtre Nouveauté ne montre que les dossiers à notification non vue", async ({
  page,
  db,
}) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  await page.getByRole("button", { name: "Filtres" }).click();
  const modale = page.getByRole("dialog", { name: "Tous les filtres" });
  await modale.locator('label[for="nouvelles-modifications"]').click();

  // Filters apply live: the URL and the background list update as soon as the box is ticked,
  // before « Rechercher » is pressed.
  await expect(page).toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("2 dossiers dans votre service");

  // The footer button reflects the live result count.
  await expect(modale.getByRole("button", { name: "Voir 2 résultats" })).toBeVisible();
  await modale.getByRole("button", { name: "Voir 2 résultats" }).click();

  // Closing the panel keeps the applied filter.
  await expect(page).toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("2 dossiers dans votre service");

  const cartes = await page.getByTestId("carte-dossier").all();
  const ordreAttendu = [fixtures.unviewedRecent.nom, fixtures.unviewedOld.nom];
  for (let i = 0; i < cartes.length; i++) {
    await expect(cartes[i]).toContainText(ordreAttendu[i]);
  }

  // The active filter shows as a removable tag; clicking it clears the filter.
  const tags = page.getByTestId("filtres-actifs");
  const tagNouveaute = tags.getByRole("button", { name: /Nouvelles modifications/ });
  await expect(tagNouveaute).toBeVisible();
  await tagNouveaute.click();

  await expect(page).not.toHaveURL(/nouveaute=oui/);
  await expect(page.getByTestId("compteur-dossier")).toContainText("4 dossiers dans votre service");
  await expect(tags).toHaveCount(0);
});

test("le badge Nouveauté disparaît après consultation du dossier", async ({ page, db }) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  const titre = page.getByRole("link", { name: fixtures.unviewedRecent.nom });
  const carte = page.getByTestId("carte-dossier").filter({ has: titre });
  const badge = carte.locator("p.fr-badge", { hasText: /Nouveauté/i });

  await expect(carte).toHaveCount(1);
  await expect(badge).toHaveCount(1);

  await titre.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(fixtures.unviewedRecent.nom);

  await page.goto("/mes-dossiers");
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();

  await expect(carte).toHaveCount(1);
  await expect(badge).toHaveCount(0);
});

test("Le badge Dossier à enjeu apparaît lorsque le dossier possède un enjeu", async ({
  page,
  db,
}) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  const titre = page.getByRole("link", { name: fixtures.unviewedRecent.nom });
  const carte = page.getByTestId("carte-dossier").filter({ has: titre });
  const badge = carte.locator("p.fr-badge", { hasText: /Dossier à enjeu/i });

  await expect(carte).toHaveCount(1);
  await expect(badge).toHaveCount(1);
});

test("la recherche filtre la liste au fil de la frappe, sans valider", async ({ page, db }) => {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: CODE,
  });

  const photovoltaique = await createDossier(db, {
    nom: "Parc photovoltaïque à Anglet",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    number_demarches_simplifiées: "29803745",
  });
  const coquelicots = await createDossier(db, {
    nom: "Recherche scientifique",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    commentaire_libre: "Présence de coquelicots sur la zone",
  });
  const methaniseur = await createDossier(db, {
    nom: "Méthaniseur",
    numéro_démarche: DEFAULT_NUMERO_DEMARCHE,
    number_demarches_simplifiées: "12345678",
  });

  for (const d of [photovoltaique, coquelicots, methaniseur]) {
    await attachDossierToGroupe(db, d.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, d.id);
  }

  await gotoMesDossiers(page);
  const cartes = page.getByTestId("carte-dossier");
  await expect(cartes).toHaveCount(3);

  const recherche = page.getByLabel("Rechercher un dossier");

  // Saisie partielle sur le nom : la liste et l'URL se mettent à jour sans valider.
  await recherche.fill("photovolta");
  await expect(page).toHaveURL(/[?&]q=photovolta/);
  await expect(cartes).toHaveCount(1);
  await expect(cartes).toContainText("Parc photovoltaïque à Anglet");

  // Nouveau champ couvert : le commentaire libre.
  await recherche.fill("coquelicot");
  await expect(cartes).toHaveCount(1);
  await expect(cartes).toContainText("Recherche scientifique");

  // Recherche partielle sur le n° DN (avant, il fallait le saisir en entier).
  await recherche.fill("298037");
  await expect(cartes).toHaveCount(1);
  await expect(cartes).toContainText("Parc photovoltaïque à Anglet");

  // En vidant la barre, on retrouve tous les dossiers.
  await recherche.fill("");
  await expect(cartes).toHaveCount(3);
});
