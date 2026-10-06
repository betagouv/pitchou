import { departements } from "@pitchou/common/departements.ts";
import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import { test, expect } from "../fixtures/playwright.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("dashboard links to pending work, respects access and clears resolved alerts", async ({
  page,
  db,
  loginAs,
}, testInfo) => {
  const admin = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({ user_id: admin.id, bundle: "administrateur" });
  const dossier = await createDossier(db, { primary_department: null });
  await db("groupe_instructeurs").insert({
    name: "Ancien groupe",
    active: false,
    coverage_needs_review: true,
  });
  const label = "Libellé à vérifier pour le tableau de bord";
  await db("activite_label").insert({
    label,
    activite_code: AUTRE_ACTIVITE_CODE,
    needs_review: true,
  });
  try {
    await loginAs(admin.codeAcces);
    await page.goto(E2E_ADMIN_BASE_URL);
    const attention = page.getByRole("region", { name: "À votre attention" });
    await expect(attention.getByRole("link")).toHaveCount(4);
    await expect(attention.getByRole("link", { name: /Dossiers sans groupe/ })).toContainText("1");
    await expect(attention.getByRole("link", { name: /Groupes à vérifier/ })).toContainText("1");
    await expect(
      attention.getByRole("link", { name: /Départements sans groupe actif/ }),
    ).toContainText(String(departements.length));
    await expect(page.getByText("Tout est à jour")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("dashboard-attention-desktop.png") });
    await attention.getByRole("link", { name: /Dossiers sans groupe/ }).click();
    await expect(page.locator("#unmatched-dossiers")).toBeInViewport();
    await page.goto(E2E_ADMIN_BASE_URL);
    await attention.getByRole("link", { name: /Groupes à vérifier/ }).click();
    await expect(page.locator("#groups-to-review")).toBeInViewport();
    await page.goto(E2E_ADMIN_BASE_URL);
    await attention.getByRole("link", { name: /Libellés d'activité/ }).click();
    await page.getByRole("button", { name: /libellé.*détecté/ }).click();
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();

    await db("auth_permission_exclusion").insert({
      user_id: admin.id,
      permission: "groups:manage",
    });
    await page.goto(E2E_ADMIN_BASE_URL);
    await expect(attention.getByRole("link")).toHaveCount(1);
    await expect(attention.getByRole("link", { name: /Libellés d'activité/ })).toBeVisible();
    await db("auth_permission_exclusion").where({ user_id: admin.id }).delete();

    await db("groupe_departement").insert(
      departements.map(({ code }) => ({ groupe_instructeurs: admin.groupeId, department: code })),
    );
    await db("groupe_instructeurs")
      .where({ id: admin.groupeId })
      .update({ coverage_needs_review: false });
    await db("activite_label").where({ label }).update({ needs_review: false });
    await page.goto(E2E_ADMIN_BASE_URL);
    await expect(attention.getByRole("link")).toHaveCount(1);
    await expect(attention.getByRole("link", { name: /Dossiers sans groupe/ })).toBeVisible();
    await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
    await page.goto(E2E_ADMIN_BASE_URL);
    await expect(attention.getByText("Tout est à jour")).toBeVisible();
    await expect(attention.getByRole("link")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("dashboard-all-clear.png") });

    await db("activite_label").where({ label }).update({ needs_review: true });
    await page.setViewportSize({ width: 390, height: 800 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(E2E_ADMIN_BASE_URL);
    await expect(attention.getByRole("link")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.screenshot({ path: testInfo.outputPath("dashboard-attention-mobile-dark.png") });
  } finally {
    await db("activite_label").where({ label }).delete();
  }
});
