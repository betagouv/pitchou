import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

const simulationEnabled = process.env.PUBLIC_PITCHOU_ENV === "staging";

for (const width of [1280, 390]) {
  test(`dossier tabs preserve drafts and the active access panel at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({
      user_id: administrator.id,
      bundle: "administrateur",
    });
    const dossier = await createDossier(db, {
      name: "Projet de démonstration",
      source: "pitchou",
      demarche_number: null,
      primary_department: "75",
    });
    const [reader] = await db("auth_user")
      .insert({ email: "lecture@example.org", permissions_configured: true })
      .returning("id");
    await db("auth_permission_bundle").insert({ user_id: reader.id, bundle: "instructeur" });
    await loginAs(administrator.codeAcces);
    await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
    const dossierTab = page.getByRole("tab", { name: "Dossier", exact: true });
    const accessTab = page.getByRole("tab", { name: "Accès au dossier", exact: true });
    const simulationTab = page.getByRole("tab", { name: "Simulation", exact: true });
    const save = page
      .locator("header.sticky")
      .getByRole("button", { name: "Enregistrer", exact: true });
    const name = page.locator("#project-name");
    const assignments = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
    const access = page.getByRole("region", { name: "Accès individuels au dossier" });

    await expect(page.getByRole("tablist").getByRole("tab")).toHaveText(
      simulationEnabled
        ? ["Dossier", "Accès au dossier", "Simulation"]
        : ["Dossier", "Accès au dossier"],
    );
    await expect(dossierTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(name).toBeVisible();
    await expect(save).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Supprimer le dossier", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phases", exact: true })).toHaveCount(0);
    await expect(assignments).toHaveCount(0);
    await expect(access).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`dossier-tab-${width}.png`) });

    await name.fill("Brouillon conservé");
    await accessTab.click();
    await expect(accessTab).toHaveAttribute("aria-selected", "true");
    await expect(assignments).toBeVisible();
    await expect(access).toBeVisible();
    await expect(save).toHaveCount(0);
    await expect(name).toHaveCount(1);
    await expect(name).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Supprimer le dossier", exact: true }),
    ).toHaveCount(0);
    const person = access.getByLabel("Accorder un accès individuel", { exact: true });
    const level = access.getByLabel("Niveau d'accès individuel", { exact: true });
    await person.selectOption(String(reader.id));
    await level.selectOption("instruct");
    await dossierTab.click();
    await expect(name).toHaveValue("Brouillon conservé");
    await expect(save).toBeVisible();
    await accessTab.click();
    await expect(person).toHaveValue(String(reader.id));
    await expect(level).toHaveValue("instruct");
    await page.getByRole("tablist").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`access-tab-${width}.png`) });

    await access.getByRole("button", { name: "Accorder l'accès", exact: true }).click();
    await expect(access).toContainText("Origine : accès individuel manuel · Instruction");
    await expect(person).toBeEnabled();
    await expect(accessTab).toHaveAttribute("aria-selected", "true");
    await expect(assignments).toBeVisible();
    await expect(save).toHaveCount(0);
    expect((await db("dossier").where({ id: dossier.id }).first()).name).toBe(
      "Projet de démonstration",
    );

    await dossierTab.click();
    await expect(name).toHaveValue("Brouillon conservé");
    await dossierTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(accessTab).toBeFocused();
    await expect(accessTab).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    const lastTab = simulationEnabled ? simulationTab : accessTab;
    await expect(lastTab).toBeFocused();
    await expect(lastTab).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(dossierTab).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(lastTab).toBeFocused();
    await page.keyboard.press("Home");
    await expect(dossierTab).toBeFocused();
    await expect(dossierTab).toHaveAttribute("aria-selected", "true");
    await expect(name).toHaveValue("Brouillon conservé");
  });
}

test("the simulation tab preserves its draft and keeps DN eligibility", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  test.skip(
    !simulationEnabled,
    "Run with PUBLIC_PITCHOU_ENV=staging to enable simulation in the e2e server.",
  );
  const administrator = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  const dn = await createDossier(db, { name: "Projet importé de démonstration" });
  const native = await createDossier(db, { source: "pitchou", demarche_number: null });
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dn.id}`);
  const simulationTab = page.getByRole("tab", { name: "Simulation", exact: true });
  const value = page.getByLabel("Nouvelle valeur", { exact: true });
  await expect(value).toHaveCount(1);
  await expect(value).toBeHidden();
  await expect(page.locator("#edit-name")).toBeDisabled();
  await simulationTab.click();
  await expect(
    page.getByRole("heading", { name: "Simuler une modification du porteur de projet" }),
  ).toBeVisible();
  await value.fill("Brouillon de simulation");
  await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
  await expect(value).toHaveCount(1);
  await expect(value).toBeHidden();
  await simulationTab.click();
  await expect(value).toHaveValue("Brouillon de simulation");
  await expect(
    page.getByRole("button", { name: "Simuler la synchronisation", exact: true }),
  ).toBeEnabled();
  await expect(
    page.locator("header.sticky").getByRole("button", { name: "Enregistrer", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Phases", exact: true })).toHaveCount(0);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`simulation-tab-${width}.png`) });
  }
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${native.id}`);
  await simulationTab.click();
  await expect(
    page.getByText("Ce dossier ne vient pas de Démarches Numériques", { exact: false }),
  ).toBeVisible();
  await expect(value).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Simuler la synchronisation", exact: true }),
  ).toHaveCount(0);
});

test("simulation stays unavailable without its permission", async ({ page, db, loginAs }) => {
  const administrator = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  await db("auth_permission_exclusion").insert({
    user_id: administrator.id,
    permission: "admin:sync:simulate",
  });
  const dossier = await createDossier(db);
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  await expect(page.getByRole("tablist").getByRole("tab")).toHaveText([
    "Dossier",
    "Accès au dossier",
  ]);
  await expect(page.locator("#simulation-valeur")).toHaveCount(0);
});
