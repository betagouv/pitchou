import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { createCapDossier, createDossier, createPersonne } from "../factories/index.ts";
import { expect, test } from "../fixtures/playwright.ts";

test("a reader without groups sees internal information and follows personally without edit controls", async ({
  page,
  db,
  loginAs,
}) => {
  const person = await createPersonne(db, { email: "observateur@example.test" });
  await createCapDossier(db, person.codeAcces);
  const dossier = await createDossier(db, {
    name: "Dossier observé",
    source: "pitchou",
    demarche_number: null,
  });
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").insert({
      dossier: dossier.id,
      user_id: person.id,
      access_level: "read",
    }),
  );
  await db("email_notification_preferences")
    .where({ personne: person.id })
    .update({ assignment: false, novelty: false, arrival: false });
  await db("commentaire").insert({
    dossier: dossier.id,
    content: "Note interne visible sans modification",
  });
  await loginAs(person.codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: "Dossier observé", exact: true })).toBeVisible();
  await expect(
    page.getByText("Note interne visible sans modification", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Historique", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Générateur de documents" })).toHaveCount(0);
  await expect(page.getByLabel("Laissez un commentaire")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions du dossier", exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Suivre ce dossier", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vous suivez ce dossier", exact: true }),
  ).toBeVisible();
  await page.goto("/mes-dossiers");
  await expect(page.getByRole("heading", { name: "Dossier observé", exact: true })).toBeVisible();
  await page.goto(`/dossier/${dossier.id}?lecture=1`);
  await expect(page.getByRole("tab", { name: "Historique", exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Note interne visible sans modification", { exact: true }),
  ).toHaveCount(0);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("tab", { name: "Historique", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vous suivez ce dossier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Suivre ce dossier", exact: true })).toBeVisible();
  expect(await db("edge_personne_follows_dossier").where({ personne: person.id })).toHaveLength(0);
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("dossier_user_access").where({ user_id: person.id }).delete(),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/acces-refuse$/u);
});
