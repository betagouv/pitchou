import { test, expect } from "../fixtures/playwright.ts";
import { gotoMesDossiers, setupMesDossiers as setup } from "./mesDossiersFixtures.ts";

test("dossiers triés par défaut sur la date de dépôt décroissante", async ({ page, db }) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  // The counter names the instructeur's single service.
  await expect(page.getByTestId("compteur-dossier")).toContainText(
    "4 dossiers dans votre service : Groupe de test",
  );

  // A dossier with an unseen nouveauté is no longer pinned on top: only the dépôt date counts.
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

test("les dossiers avec notification non vue portent un badge de modification", async ({
  page,
  db,
}) => {
  await setup(db);
  await gotoMesDossiers(page);

  const withBadge = await page
    .getByTestId("card-dossier")
    .filter({ has: page.locator("p.fr-badge--new") })
    .all();

  expect(withBadge).toHaveLength(2);
  // The badge dates the change rather than merely flagging it.
  await expect(page.locator("p.fr-badge--new").first()).toContainText(/^Modifié /i);
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

test("le badge de modification disparaît après consultation du dossier", async ({ page, db }) => {
  const fixtures = await setup(db);
  await gotoMesDossiers(page);

  const title = page.getByRole("link", { name: fixtures.unviewedRecent.name });
  const card = page.getByTestId("card-dossier").filter({ has: title });
  const badge = card.locator("p.fr-badge--new");

  await expect(card).toHaveCount(1);
  await expect(badge).toHaveCount(1);

  await title.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(fixtures.unviewedRecent.name);
  // The dossier is only marked read after staying a few seconds on it.
  await page.waitForTimeout(5500);

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
