import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("create-only users compose a draft before saving and cannot edit or publish it afterward", async ({
  page,
  db,
  loginAs,
}) => {
  const user = await createInstructeurWithCapToGroup(db);
  await db("auth_permission").insert([
    { user_id: user.id, permission: "admin:access" },
    { user_id: user.id, permission: "admin:changelog:create" },
  ]);
  await loginAs(user.codeAcces);
  await page.goto(E2E_ADMIN_BASE_URL + "/changelog");
  await page.getByRole("button", { name: "Nouvelle entrée", exact: true }).click();
  await expect(page).toHaveURL(/\/changelog\/nouveau$/);
  await page.getByLabel("Titre", { exact: true }).fill("Première note");
  await page.locator(".tiptap").fill("Le contenu du brouillon initial.");
  await page.getByLabel("Version majeure", { exact: true }).fill("1");
  await page.getByLabel("Version mineure", { exact: true }).fill("2");
  await page.getByLabel("Version correctif", { exact: true }).fill("3");
  expect(await db("changelog")).toHaveLength(0);
  await expect(page.getByRole("switch")).toHaveCount(0);

  await page.getByRole("link", { name: "Annuler", exact: true }).click();
  await expect(page).toHaveURL(/\/changelog$/);
  expect(await db("changelog")).toHaveLength(0);
  await page.getByRole("button", { name: "Nouvelle entrée", exact: true }).click();
  await page.getByLabel("Titre", { exact: true }).fill("Première note");
  await page.locator(".tiptap").fill("Le contenu du brouillon initial.");
  await page.route("**/api/changelog", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({ status: 500, body: "Création indisponible" });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Création indisponible");
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Première note");
  await expect(page.locator(".tiptap")).toContainText("Le contenu du brouillon initial.");
  expect(await db("changelog")).toHaveLength(0);
  await page.unroute("**/api/changelog");
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  await expect(page).toHaveURL(/\/changelog\/\d+$/);
  const [entry] = await db("changelog");
  expect(entry).toMatchObject({
    titre: "Première note",
    contenu: "<p>Le contenu du brouillon initial.</p>",
    published: false,
  });
  await expect(page.getByLabel("Titre", { exact: true })).toBeDisabled();
  await expect(page.locator(".tiptap")).toHaveAttribute("contenteditable", "false");
  await expect(page.getByRole("switch")).toBeDisabled();
});
