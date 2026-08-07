import type { Knex } from "knex";
import { test, expect } from "../fixtures/playwright.ts";
import {
  attachCapToGroupe,
  createCapDossier,
  createCapEvenementMetrique,
  createInstructeurWithDossier,
  createPersonne,
} from "../factories/index.ts";
import { attachPersonneSuitDossier } from "../factories/notification.ts";

async function createGroupeMember(
  db: Knex,
  groupeId: string,
  email: string,
  codeAcces: string,
  identity: { first_names?: string; last_name?: string } = {},
) {
  const personne = await createPersonne(db, { email, access_code: codeAcces, ...identity });
  const { cap } = await createCapDossier(db, personne.codeAcces);
  await attachCapToGroupe(db, cap, groupeId);
  return personne;
}

test("assigning a dossier adds and removes followers and marks it as new", async ({ page, db }) => {
  const assigner = await createInstructeurWithDossier(db, {
    email: "assigner@test.fr",
    codeAcces: "assigner-code",
    dossierNom: "Projet de restauration écologique",
  });
  await createCapEvenementMetrique(db, assigner.codeAcces);
  const formerMember = await createGroupeMember(
    db,
    assigner.groupeId,
    "former-member@test.fr",
    "former-member-code",
  );
  const memberOne = await createGroupeMember(
    db,
    assigner.groupeId,
    "member-one@test.fr",
    "member-one-code",
    { first_names: "Camille", last_name: "Martin" },
  );
  const memberTwo = await createGroupeMember(
    db,
    assigner.groupeId,
    "member-two@test.fr",
    "member-two-code",
  );
  await attachPersonneSuitDossier(db, formerMember.id, assigner.dossier.id);

  await page.goto(`/?secret=${assigner.codeAcces}`);
  await page.getByRole("link", { name: "Tous les dossiers", exact: true }).click();
  let card = page.getByTestId("card-dossier").filter({ hasText: assigner.dossier.name! });
  await card.getByRole("link", { name: assigner.dossier.name! }).click();
  await expect(page.getByRole("button", { name: "Suivre ce dossier" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Plus d’actions/ })).toBeVisible();

  await page.goto("/tous-les-dossiers");
  card = page.getByTestId("card-dossier").filter({ hasText: assigner.dossier.name! });
  await card.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Faire suivre le dossier" }).click();

  const dialog = page.getByRole("dialog", { name: "Faire suivre le dossier" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Instructeur·ice(s) suivant le dossier" }),
  ).toBeVisible();
  const followerSelector = dialog.getByLabel("Ajouter une personne au suivi du dossier");
  await expect(followerSelector).toBeVisible();
  await followerSelector.click();
  await expect(dialog.getByRole("option", { name: assigner.email, exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("option", { name: /Camille Martin.*member-one@test\.fr/ }),
  ).toBeVisible();
  await expect(dialog.getByRole("option", { name: memberTwo.email, exact: true })).toBeVisible();
  await followerSelector.press("Escape");
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs(dialogBox!.x + dialogBox!.width / 2 - viewport!.width / 2)).toBeLessThan(2);
  expect(Math.abs(dialogBox!.y + dialogBox!.height / 2 - viewport!.height / 2)).toBeLessThan(2);

  await dialog
    .getByRole("button", {
      name: `Retirer ${formerMember.email} des personnes qui suivent le dossier`,
    })
    .click();
  await followerSelector.fill("camille");
  await dialog.getByRole("option", { name: /Camille Martin.*member-one@test\.fr/ }).click();
  await expect(
    dialog.getByRole("button", {
      name: `Retirer ${memberOne.email} des personnes qui suivent le dossier`,
    }),
  ).toBeVisible();
  await followerSelector.fill(memberTwo.email);
  await dialog.getByRole("option", { name: memberTwo.email, exact: true }).click();
  await dialog.getByRole("button", { name: "Attribuer le dossier" }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(async () =>
      db("evenement_metrique")
        .select(["evenement", "details"])
        .where({ evenement: "assignDossierFollowers" })
        .first(),
    )
    .toEqual({
      evenement: "assignDossierFollowers",
      details: {
        dossierId: assigner.dossier.id,
        followerCount: 2,
        addedPersonneEmails: [memberOne.email, memberTwo.email],
        removedPersonneEmails: [formerMember.email],
      },
    });

  await page.goto(`/?secret=${memberOne.codeAcces}`);
  const memberOneCard = page
    .getByTestId("card-dossier")
    .filter({ hasText: assigner.dossier.name! });
  await expect(memberOneCard).toBeVisible();
  await expect(memberOneCard.getByText("Nouveauté", { exact: true })).toBeVisible();

  await page.goto(`/?secret=${memberTwo.codeAcces}`);
  const memberTwoCard = page
    .getByTestId("card-dossier")
    .filter({ hasText: assigner.dossier.name! });
  await expect(memberTwoCard).toBeVisible();
  await expect(memberTwoCard.getByText("Nouveauté", { exact: true })).toBeVisible();

  await page.goto(`/?secret=${formerMember.codeAcces}`);
  await expect(
    page.getByTestId("card-dossier").filter({ hasText: assigner.dossier.name! }),
  ).toHaveCount(0);
});

test("assigning oneself while viewing a dossier immediately marks it as viewed", async ({
  page,
  db,
}) => {
  const assigner = await createInstructeurWithDossier(db, {
    email: "self-assigner@test.fr",
    codeAcces: "self-assigner-code",
    dossierNom: "Projet de renaturation",
  });

  await page.goto(`/dossier/${assigner.dossier.id}?secret=${assigner.codeAcces}`);
  await page.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Faire suivre le dossier" }).click();
  const dialog = page.getByRole("dialog", { name: "Faire suivre le dossier" });
  const followerSelector = dialog.getByLabel("Ajouter une personne au suivi du dossier");
  await followerSelector.fill(assigner.email);
  await dialog.getByRole("option", { name: assigner.email, exact: true }).click();
  await dialog.getByRole("button", { name: "Attribuer le dossier" }).click();
  await expect(dialog).toBeHidden();

  await expect
    .poll(async () =>
      db("notification")
        .select("viewed")
        .where({ personne: assigner.id, dossier: assigner.dossier.id })
        .first(),
    )
    .toEqual({ viewed: true });

  await page.getByRole("link", { name: "Mes dossiers", exact: true }).click();
  const card = page.getByTestId("card-dossier").filter({ hasText: assigner.dossier.name! });
  await expect(card).toBeVisible();
  await expect(card.getByText("Nouveauté", { exact: true })).toHaveCount(0);
});
