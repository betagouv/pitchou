import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";

for (const missing of ["group", "permission"] as const) {
  test(`signed-in users missing a ${missing} reach the access page`, async ({
    page,
    db,
    loginAs,
  }) => {
    const user = await createInstructeurWithCapToGroup(db);
    await loginAs(user.codeAcces);
    const membership = await db("user_groupe").where({ user_id: user.id }).first();
    if (missing === "group") {
      await db("user_groupe").where({ user_id: user.id }).delete();
    } else {
      await db("auth_permission_exclusion").insert({
        user_id: user.id,
        permission: "dossier:read",
      });
    }
    await page.goto("/auth/acces-refuse");
    await page.getByTitle("Accueil - Pitchou", { exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
    await expect(page.getByRole("heading", { name: "Votre accès aux dossiers" })).toBeVisible();
    for (const label of ["Mes dossiers", "Tous les dossiers", "Tableau de suivi"]) {
      await page
        .locator("header")
        .getByRole("link", { name: new RegExp(label) })
        .click();
      await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
    }
    for (const path of [
      "/",
      "/connexion",
      "/mes-dossiers",
      "/tous-les-dossiers",
      "/tableau-de-suivi",
      "/dossier/1",
      "/auth/login",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
      await expect(page.getByRole("heading", { name: "Votre accès aux dossiers" })).toBeVisible();
    }
    // Data requests still fail with 403 instead of returning a page or following a redirect.
    const status = await page.evaluate(async () => {
      const response = await fetch("/dossiers", { headers: { Accept: "application/json" } });
      return response.status;
    });
    expect(status).toBe(403);

    // Reload uses the current access rights without requiring another sign-in.
    await page.reload();
    await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
    if (missing === "group") {
      await db("user_groupe").insert(membership);
    } else {
      await db("auth_permission_exclusion")
        .where({ user_id: user.id, permission: "dossier:read" })
        .delete();
    }
    await page.reload();
    await expect(page).toHaveURL(/\/mes-dossiers$/);
  });
}

test("anonymous visitors sign in and authorized users reach their dossiers", async ({
  page,
  db,
  loginAs,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { name: "Connexion à Pitchou" })).toBeVisible();
  await page.goto("/auth/acces-refuse");
  await expect(page).toHaveURL(/\/auth\/acces-refuse$/);
  await expect(page.getByRole("heading", { name: "Votre accès aux dossiers" })).toBeVisible();
  await page.getByRole("link", { name: "Retour à la connexion" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  const user = await createInstructeurWithCapToGroup(db);
  await loginAs(user.codeAcces);
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/mes-dossiers$/);
  await page.goto("/auth/acces-refuse");
  await expect(page).toHaveURL(/\/mes-dossiers$/);
});

test("disabled accounts can read the denial reason without an authenticated session", async ({
  page,
  db,
  loginAs,
}) => {
  const user = await createInstructeurWithCapToGroup(db);
  await loginAs(user.codeAcces);
  await db("auth_user").where({ id: user.id }).update({ active: false });
  await page.goto("/auth/acces-refuse?reason=disabled");
  await expect(page).toHaveURL(/\/auth\/acces-refuse\?reason=disabled$/);
  await expect(
    page.getByText("Votre compte Pitchou est désactivé. Vous ne pouvez pas accéder aux dossiers."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Contacter le support" })).toBeVisible();
  const status = await page.evaluate(async () => (await fetch("/dossiers")).status);
  expect(status).toBe(401);
});
