import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL, E2E_BASE_URL } from "../setup/e2e-global.ts";

for (const logoutApp of ["instructeur", "admin"]) {
  test(`signing out of ${logoutApp} ends the browser session in both apps`, async ({
    page,
    context,
    db,
    loginAs,
  }) => {
    const user = await createInstructeurWithCapToGroup(db);
    await db("auth_permission_bundle").insert({ user_id: user.id, bundle: "administrateur" });
    await loginAs(user.codeAcces);

    await page.goto(`${E2E_BASE_URL}/mes-dossiers`);
    await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();
    const adminPage = await context.newPage();
    await adminPage.goto(E2E_ADMIN_BASE_URL);
    await expect(adminPage.locator("#admin-sidebar")).toBeVisible();

    const logoutPage = logoutApp === "instructeur" ? page : adminPage;
    const origin = logoutApp === "instructeur" ? E2E_BASE_URL : E2E_ADMIN_BASE_URL;
    await logoutPage.goto(`${origin}/auth/logout`);
    await expect(
      logoutPage.getByRole("link", { name: "S'identifier avec ProConnect" }),
    ).toBeVisible();

    await page.goto(`${E2E_BASE_URL}/mes-dossiers`);
    await expect(page).toHaveURL(/\/auth\/login\?redirectTo=/);
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/auth\/login/);
    expect((await context.request.get(`${E2E_BASE_URL}/api/session`)).status()).toBe(401);
    expect((await context.request.get(`${E2E_ADMIN_BASE_URL}/api/users`)).status()).toBe(401);
    await page.reload();
    await expect(page.getByRole("link", { name: "S'identifier avec ProConnect" })).toBeVisible();
  });
}
