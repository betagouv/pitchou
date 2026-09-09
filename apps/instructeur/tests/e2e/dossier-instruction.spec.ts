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
  await expect
    .poll(() =>
      db("dossier")
        .select("id")
        .where({
          id: dossier.id,
          public_consultation_start_date: "2025-03-10",
          public_consultation_end_date: "2025-04-30",
        })
        .first(),
    )
    .toEqual({ id: dossier.id });

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

test("l'entité en charge est persistée sans tâche", async ({ page, db, loginAs }) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@prochaine-action.fr",
    dossierNom: "Dossier prochaine action e2e",
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}?tab=instruction`);
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();

  const action = page.getByLabel("Entité en charge de la prochaine action");

  await action.click();
  const options = page.getByRole("listbox");
  await expect(options.getByRole("option")).toHaveText([
    "Non renseignée",
    "Instructeur-ice (Moi)",
    "CNPN/CSRPN",
    "Pétitionnaire",
    "Consultation du public",
    "Préfet-e",
    "Tierce personne/administration",
  ]);

  await options.getByRole("option", { name: "Instructeur-ice (Moi)", exact: true }).click();
  await expect
    .poll(() =>
      db("dossier")
        .select("next_action_expected_from", "next_action_expected")
        .where({ id: dossier.id })
        .first(),
    )
    .toEqual({ next_action_expected_from: "Instructeur", next_action_expected: null });

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(action).toHaveText("Instructeur-ice (Moi)");

  await chooseInSelect(action, "CNPN/CSRPN");
  await expect
    .poll(() =>
      db("dossier")
        .select("next_action_expected_from", "next_action_expected")
        .where({ id: dossier.id })
        .first(),
    )
    .toEqual({ next_action_expected_from: "CNPN/CSRPN", next_action_expected: null });

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(action).toHaveText("CNPN/CSRPN");
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
  await expect
    .poll(() => db("dossier").select("enjeu").where({ id: dossier.id }).first())
    .toEqual({ enjeu: true });

  await page.reload();
  await expect(page.getByRole("heading", { name: dossier.name! })).toBeVisible();
  await expect(page.locator("#enjeu")).toHaveText("Oui");
});
