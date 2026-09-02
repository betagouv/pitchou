import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { chooseInSelect } from "../helpers/select.ts";

test("l'instructeurice saisit les dates de consultation du public et elles sont persistées", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@consultation2.fr",
    dossierNom: "Dossier consultation pré-rempli e2e",
  });

  await loginAs(codeAcces);

  await page.goto(`/dossier/${dossier.id}?tab=instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await page.getByLabel("Date de début").fill("10/03/2025");
  await page.getByLabel("Date de fin").fill("30/04/2025");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.getByLabel("Date de début")).toHaveValue("10/03/2025");
  await expect(page.getByLabel("Date de fin")).toHaveValue("30/04/2025");
});

test("les anciens liens avec ancre ouvrent toujours le bon onglet", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@ancre-legacy.fr",
    dossierNom: "Dossier lien ancre e2e",
  });

  await loginAs(codeAcces);
  // Tabs moved to the `tab` query param; legacy hash links keep working.
  await page.goto(`/dossier/${dossier.id}#instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.locator("#enjeu")).toBeVisible();
});

test("la prochaine action attendue groupe les actions par entité et est persistée", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@prochaine-action.fr",
    dossierNom: "Dossier prochaine action e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}?tab=instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  const action = page.locator("#next_action_expected");

  // Each entity is a group, and every group ends with « Autre ».
  await action.click();
  const options = page.getByRole("listbox");
  await expect(options.getByRole("group").nth(1)).toHaveAttribute("aria-label", "Instructeur");
  await expect(options.getByRole("group", { name: "Préfet·e" }).getByRole("option")).toHaveText([
    "Signer l'arrêté",
    "Autre",
  ]);

  // Picking an action sets the entity in charge along with it.
  await options.getByRole("option", { name: "Envoyer la saisine", exact: true }).click();
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();
  await expect(page.getByText("Entité en charge : Instructeur")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(action).toHaveText("Envoyer la saisine");
  await expect(page.getByText("Entité en charge : Instructeur")).toBeVisible();

  // « Autre » keeps the entity without a precise action.
  await action.click();
  await page
    .getByRole("listbox")
    .getByRole("group", { name: "CNPN/CSRPN" })
    .getByRole("option", { name: "Autre", exact: true })
    .click();
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.locator("#next_action_expected")).toHaveText("Autre");
  await expect(page.getByText("Entité en charge : CNPN/CSRPN")).toBeVisible();
  await expect(
    db("dossier").select("next_action_expected").where({ id: dossier.id }).first(),
  ).resolves.toEqual({ next_action_expected: null });
});

test("The 'Dossier à enjeu' toggle is disabled by default if the file is not a stakeholder file", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@enjeu-default.fr",
    dossierNom: "Dossier sans enjeu e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}?tab=instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.locator("#enjeu")).toHaveText("Non");
});

test("Changing the 'Dossier à enjeu' select changes the stake value of the case, and when reloading, this modified value persists.", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@enjeu-click.fr",
    dossierNom: "Dossier enjeu à modifier e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}?tab=instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  await expect(page.locator("#enjeu")).toHaveText("Non");
  await chooseInSelect(page.locator("#enjeu"), "Oui");
  await expect(page.getByText("Le dossier a bien été mis à jour.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.locator("#enjeu")).toHaveText("Oui");
});
