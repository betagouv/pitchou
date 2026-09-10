import { test, expect } from "../fixtures/playwright.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

for (const width of [1280, 390]) {
  test(`localisation sans partage entre services, filtres persistants et lecture seule (${width}px)`, async ({
    page,
    db,
    loginAs,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const owner = await createInstructeurWithCapToGroup(db, {
      email: "instructeur@pays-de-la-loire.fr",
      nomGroupe: "Service Pays de la Loire",
    });
    const foreignGroup = await createGroupeInstructeurs(db, { name: "Autre service" });
    const followed = await createDossier(db, {
      name: "Restauration de la Loire à Nantes",
      departments: JSON.stringify(["44"]),
    });
    const unfollowed = await createDossier(db, {
      name: "Suivi scientifique en Anjou et Vendée",
      departments: JSON.stringify(["49", "85"]),
    });
    const nearby = await createDossier(db, {
      name: "Aménagement des berges à Angers",
      departments: JSON.stringify(["49"]),
    });
    const elsewhere = await createDossier(db, {
      name: "Rénovation à Paris",
      departments: JSON.stringify(["75"]),
    });
    const unlocated = await createDossier(db, {
      name: "Projet sans département renseigné",
      departments: null,
    });
    for (const dossier of [followed, unfollowed]) {
      await attachDossierToGroupe(db, dossier.id, owner.groupeId);
    }
    for (const dossier of [nearby, elsewhere, unlocated]) {
      await attachDossierToGroupe(db, dossier.id, foreignGroup.id);
    }
    await attachPersonneSuitDossier(db, owner.id, followed.id);

    await loginAs(owner.codeAcces);
    await page.goto("/mes-dossiers");
    const cards = page.getByTestId("card-dossier");
    const counter = page.getByTestId("compteur-dossier");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(followed.name!);
    await expect(counter).toContainText("1 dossiers suivis dans vos territoires d'affectation");

    // Unfollowed owned summaries also contribute every one of their departments.
    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    const dialog = page.getByRole("dialog", { name: "Tous les filtres" });
    const location = dialog.getByRole("group", { name: "Localisation", exact: true });
    await expect(location.getByRole("radio")).toHaveCount(0);
    await location.getByRole("button", { name: "Tous les départements" }).click();
    await expect(location.getByRole("checkbox")).toHaveCount(3);
    for (const code of ["44", "49", "85"]) {
      await expect(location.getByRole("checkbox", { name: new RegExp(`^${code} `) })).toBeChecked();
    }
    await expect(location.getByRole("checkbox", { name: /^75 / })).toHaveCount(0);
    await location.getByRole("button", { name: "Aucun", exact: true }).click();
    await location.locator("label").filter({ hasText: /^49 / }).click();
    await expect(cards).toHaveCount(0);
    await location.locator("label").filter({ hasText: /^44 / }).click();
    await expect(cards).toHaveCount(1);
    await dialog.getByRole("button", { name: "Voir 1 résultat", exact: true }).click();

    await page.goto("/tous-les-dossiers");
    await expect(cards).toHaveCount(2);
    await expect(counter).toContainText("2 dossiers dans vos territoires d'affectation");
    const ownedCard = cards.filter({ hasText: followed.name! });
    await expect(
      ownedCard.getByRole("button", { name: "Ne plus suivre", exact: true }),
    ).toBeVisible();
    await expect(ownedCard.locator('button[aria-haspopup="menu"]')).toBeVisible();
    await expect(ownedCard.getByRole("link")).toHaveAttribute("href", `/dossier/${followed.id}`);
    const foreignCard = cards.filter({ hasText: nearby.name! });
    await expect(foreignCard).toHaveCount(0);
    await expect(cards.filter({ hasText: elsewhere.name! })).toHaveCount(0);
    await expect(cards.filter({ hasText: unlocated.name! })).toHaveCount(0);

    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    await expect(
      location.getByRole("radio", { name: "Mes territoires d'affectation" }),
    ).toBeChecked();
    await location.getByRole("button", { name: "Tous les départements" }).click();
    await location.getByRole("button", { name: "Aucun", exact: true }).click();
    await expect(page).toHaveURL(/departements=none/);
    await expect(cards).toHaveCount(0);
    await page.reload();
    await expect(cards).toHaveCount(0);
    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    await location.getByRole("button", { name: "Aucun département", exact: true }).click();
    await expect(location.getByRole("checkbox", { checked: true })).toHaveCount(0);
    await location.locator("label").filter({ hasText: /^49 / }).click();
    await expect(page).toHaveURL(/departements=custom/);
    await expect(page).toHaveURL(/departement=49/);
    await expect(cards).toHaveCount(1);
    await expect(cards.filter({ hasText: unfollowed.name! })).toHaveCount(1);
    await expect(foreignCard).toHaveCount(0);
    await page.reload();
    await expect(cards).toHaveCount(1);
    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    await location.locator('label[for="localisation-france"]').click();
    await expect(page).toHaveURL(/localisation=france/);
    await expect(page).not.toHaveURL(/departements?=/);
    await expect(cards).toHaveCount(5);
    await dialog.getByRole("button", { name: "Voir 5 résultats", exact: true }).click();
    await page.reload();
    await expect(cards).toHaveCount(5);
    await expect(counter).toContainText("5 dossiers en France entière (lecture seule)");
    await expect(cards.getByRole("button")).toHaveCount(0);
    await expect(foreignCard.getByLabel("Lecture seule", { exact: true })).toBeVisible();
    for (const dossier of [followed, unfollowed, nearby, elsewhere, unlocated]) {
      await expect(page.getByRole("link", { name: dossier.name!, exact: true })).toHaveAttribute(
        "href",
        `/dossier/${dossier.id}?lecture=1`,
      );
    }

    // National scope opens owners in read-only mode too, but only owners can leave it.
    for (const dossier of [nearby, followed]) {
      await page.getByRole("link", { name: dossier.name!, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dossier/${dossier.id}\\?lecture=1`));
      await expect(page.getByRole("heading", { level: 2, name: dossier.name! })).toBeVisible();
      await expect(page.getByText("Dossier en lecture seule", { exact: true })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Phase en cours" })).toBeDisabled();
      await expect(page.getByRole("tab", { name: "Historique", exact: true })).toHaveCount(0);
      await expect(page.getByLabel("Laissez un commentaire")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Repasser en mode édition" })).toHaveCount(
        dossier === followed ? 1 : 0,
      );
      await page.goto("/tous-les-dossiers?localisation=france");
    }

    await page.goto("/mes-dossiers?localisation=france");
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText(followed.name!);
    await expect(counter).toContainText("1 dossiers suivis dans vos territoires d'affectation");
    await expect(ownedCard.getByRole("link")).toHaveAttribute("href", `/dossier/${followed.id}`);
    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    await expect(location.getByRole("radio")).toHaveCount(0);
    await location.getByRole("button", { name: "Tous les départements" }).click();
    await expect(location.getByRole("checkbox")).toHaveCount(3);
    await location.getByRole("button", { name: "Aucun", exact: true }).click();
    await location.locator("label").filter({ hasText: /^49 / }).click();
    await expect(cards).toHaveCount(0);
    await expect(page).not.toHaveURL(/localisation=france/);
    await page.reload();
    await expect(cards).toHaveCount(0);
    await page.getByRole("button", { name: /^Filtres\b/ }).click();
    await location.getByRole("button", { name: /^49 / }).click();
    await location.locator("label").filter({ hasText: /^44 / }).click();
    await expect(cards).toHaveCount(1);
    await expect(ownedCard.getByRole("link")).toHaveAttribute("href", `/dossier/${followed.id}`);
    await page.goto("/tous-les-dossiers");
    await expect(cards).toHaveCount(2);
    await expect(
      ownedCard.getByRole("button", { name: "Ne plus suivre", exact: true }),
    ).toBeVisible();
  });
}
