import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup, createGroupeInstructeurs } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const kind of ["user", "group"]) {
  test(`a delayed ${kind} save cannot navigate away from another editor`, async ({
    page,
    db,
    loginAs,
  }) => {
    const actor = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
    const users = await db("auth_user")
      .insert([{ email: "first@example.org" }, { email: "second@example.org" }])
      .returning("*");
    const firstGroup = await createGroupeInstructeurs(db, { name: "Premier service" });
    const secondGroup = await createGroupeInstructeurs(db, { name: "Second service" });
    const directory = kind === "user" ? "utilisateurs" : "groupes-instructeurs";
    const first = kind === "user" ? "first@example.org" : firstGroup.name;
    const second = kind === "user" ? "second@example.org" : secondGroup.name;
    const secondId = kind === "user" ? users[1].id : secondGroup.id;
    let release!: () => void;
    let captured!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const received = new Promise<void>((resolve) => {
      captured = resolve;
    });
    await page.route(`**/${directory}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      captured();
      await gate;
      await route.fulfill({ response });
    });
    await loginAs(actor.codeAcces);
    await page.goto(`${E2E_ADMIN_BASE_URL}/${directory}`);
    await page.getByRole("button", { name: `Modifier ${first}`, exact: true }).click();
    if (kind === "group")
      await page.getByRole("button", { name: "Vérifier les affectations", exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await received;
    try {
      await page.goBack();
      await page.getByRole("button", { name: `Modifier ${second}`, exact: true }).click();
      if (kind === "user") await page.getByRole("switch", { name: "Compte actif" }).uncheck();
      else await page.getByLabel("Nom du groupe").fill("Brouillon conservé");
      const response = page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().endsWith(`/${directory}`),
      );
      release();
      await (await response).finished();
      // Let the delayed action and any incorrectly triggered invalidation/navigation settle.
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(`${E2E_ADMIN_BASE_URL}/${directory}/${secondId}`);
      if (kind === "user")
        await expect(page.getByRole("switch", { name: "Compte actif" })).not.toBeChecked();
      else await expect(page.getByLabel("Nom du groupe")).toHaveValue("Brouillon conservé");
      await expect(page.locator("header").getByRole("status")).toBeEmpty();
    } finally {
      release();
    }
  });
}
