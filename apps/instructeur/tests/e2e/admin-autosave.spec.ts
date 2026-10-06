import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("admin autosave uses the header and keeps failed saves beside the editor", async ({
  page,
  db,
  loginAs,
}) => {
  const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  await loginAs(administrator.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/changelog");
  await page.locator("header").getByRole("button", { name: "Nouvelle entrée" }).click();
  await expect(page.getByLabel("Titre", { exact: true })).toBeVisible();
  const status = page.locator("header").getByRole("status");
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect(page).toHaveURL(/\/changelog\/\d+$/);
  await expect(status).toHaveText("Brouillon créé");
  await page.getByLabel("Titre", { exact: true }).fill("Nouvelle version");
  await expect(status).toHaveText("Enregistrement…");
  await expect(status).toHaveText("Enregistré");
  await expect(page.locator("main").getByRole("status")).toHaveCount(0);

  await page.route("**/api/changelog/*", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({ status: 500, body: "Sauvegarde indisponible" });
    else await route.continue();
  });
  await page.getByLabel("Titre", { exact: true }).fill("Modification non enregistrée");
  await expect(page.getByRole("alert")).toContainText("Sauvegarde indisponible");
  await expect(status).toBeEmpty();

  await page.unroute("**/api/changelog/*");
  await page.getByLabel("Titre", { exact: true }).fill("Version corrigée");
  await expect(status).toHaveText("Enregistré");

  // A save that finishes after leaving must not put feedback on the next page.
  let releaseSave!: () => void;
  let markStarted!: () => void;
  const saveHeld = new Promise<void>((resolve) => (releaseSave = resolve));
  const saveStarted = new Promise<void>((resolve) => (markStarted = resolve));
  await page.route("**/api/changelog/*", async (route) => {
    if (route.request().method() === "PUT") {
      markStarted();
      await saveHeld;
    }
    await route.continue();
  });
  await page.getByLabel("Titre", { exact: true }).fill("Enregistrement avant navigation");
  await saveStarted;
  await expect(status).toHaveText("Enregistrement…");
  const saveFinished = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" && response.url().includes("/api/changelog/"),
  );
  await page.getByRole("link", { name: "Groupes instructeurs", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Groupes instructeurs");
  await expect(status).toBeEmpty();
  releaseSave();
  expect((await saveFinished).ok()).toBe(true);
  await expect(status).toBeEmpty();
});
