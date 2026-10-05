import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("all admin pages contain their content on desktop and mobile", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  const native = await createDossier(db, {
    name: "Dossier créé dans Pitchou",
    source: "pitchou",
    primary_department: "75",
    demarche_number: null,
  });
  const dn = await createDossier(db, {
    name: "Dossier importé",
    source: "demarche_numerique",
    primary_department: "33",
  });
  await loginAs(admin.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/changelog");
  await page.getByRole("button", { name: "Nouvelle entrée" }).click();
  await expect(page.getByLabel("Titre", { exact: true })).toBeVisible();
  const entryPath = new URL(page.url()).pathname;
  const paths = [
    "/",
    "/dossiers",
    `/dossiers/${native.id}`,
    `/dossiers/${dn.id}`,
    "/dossiers/nouveau",
    "/utilisateurs",
    "/groupes-instructeurs",
    "/aarri",
    "/activites",
    "/especes-protegees",
    "/evenements",
    "/mails",
    "/changelog",
    entryPath,
    "/tech",
  ];
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme: width === 1280 ? "light" : "dark" });
    for (const path of paths) {
      await page.goto(E2E_ADMIN_BASE_URL + path);
      await expect(page.locator("main")).toBeVisible();
      if (path === `/dossiers/${native.id}`)
        await expect(page.locator("#project-name")).toBeVisible();
      if (path === `/dossiers/${dn.id}`) {
        await expect(page.locator("#edit-name")).toBeDisabled();
        await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toHaveCount(0);
      }
      if (path === entryPath) await expect(page.getByLabel("Titre", { exact: true })).toBeVisible();
      await expect(page.getByText("Erreur lors du chargement", { exact: false })).toHaveCount(0);
      const dimensions = await page
        .locator("main")
        .evaluate((el) => ({ width: el.clientWidth, content: el.scrollWidth }));
      expect(dimensions.content, `${path} at ${width}px`).toBeLessThanOrEqual(dimensions.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBe(width);
      await page.screenshot({
        path: testInfo.outputPath(`${path.replaceAll("/", "_") || "dashboard"}-${width}.png`),
      });
    }
  }
  await page.goto(E2E_ADMIN_BASE_URL + `/dossiers/${native.id}`);
  await expect(page.locator("#project-name")).toBeVisible();
  await expect(page.locator("#information-title")).toHaveCSS("font-size", "16px");
  await page.locator("#project-name").fill("Projet mis à jour dans Pitchou");
  await page.locator("main").evaluate((el) => {
    el.parentElement!.scrollTop = 100000;
  });
  const save = page
    .locator("header.sticky")
    .getByRole("button", { name: "Enregistrer", exact: true });
  await expect(save).toBeInViewport();
  await expect(page.getByText("Créé dans Pitchou", { exact: true })).not.toBeInViewport();
  await save.click();
  await expect
    .poll(async () => (await db("dossier").where({ id: native.id }).first()).name)
    .toBe("Projet mis à jour dans Pitchou");
  await page.goto(E2E_ADMIN_BASE_URL + "/mails");
  await expect(page.getByRole("button", { name: "Enregistrer", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Aide : Mails" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Une ouverture détectée ne garantit pas que le message a été lu intégralement.",
  );
  await page.keyboard.press("Escape");
  await page.goto(E2E_ADMIN_BASE_URL + "/missing-page");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
