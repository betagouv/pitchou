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
    unviewedRecent: { id: unviewedRecent.id, nom: unviewedRecent.name! },
    unviewedOld: { id: unviewedOld.id, nom: unviewedOld.name! },
    viewedRecent: { id: viewedRecent.id, nom: viewedRecent.name! },
    noNotificationOld: { id: noNotificationOld.id, nom: noNotificationOld.name! },
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

  await expect(page.getByTestId("compteur-dossier")).toContainText("4/4 dossiers");

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

  await page.getByRole("button", { name: "Nouveauté" }).click();

  await expect(page.getByTestId("compteur-dossier")).toContainText("2/4 dossiers");

  const cartes = await page.getByTestId("carte-dossier").all();
  const ordreAttendu = [fixtures.unviewedRecent.nom, fixtures.unviewedOld.nom];
  for (let i = 0; i < cartes.length; i++) {
    await expect(cartes[i]).toContainText(ordreAttendu[i]);
  }
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
