import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("an administrator prepares a user and assigns department coverage through the forms", async ({
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
  await page.goto(`${E2E_ADMIN_BASE_URL}/utilisateurs`);
  await expect(page.getByRole("heading", { level: 1, name: "Utilisateurs" })).toBeVisible();
  await page.locator("header").getByRole("button", { name: "Préparer un compte" }).click();
  await page.getByLabel("Adresse e-mail professionnelle").fill("future@example.org");
  await page.getByLabel("Instructeur", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("header").getByRole("status")).toHaveText("Utilisateur enregistré");
  await expect(page.locator("main .fr-alert--success")).toHaveCount(0);
  const [user] = await db("auth_user").where({ email: "future@example.org" });
  expect(await db("auth_permission_bundle").where({ user_id: user.id }).pluck("bundle")).toEqual([
    "instructeur",
  ]);

  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "État", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Gestion", exact: true })).toHaveCount(0);
  await page.locator("header").getByRole("button", { name: "Créer un groupe" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouveau groupe" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator("footer").getByRole("button", { name: "Enregistrer", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(
    dialog.locator("footer").getByRole("button", { name: "Annuler", exact: true }),
  ).toBeInViewport();
  await expect(
    dialog.locator("footer").getByRole("button", { name: "Enregistrer", exact: true }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel("Nom du groupe").fill("Service Paris");
  await page.getByRole("searchbox", { name: "Rechercher un département" }).fill("paris");
  await page.getByLabel("75 · Paris", { exact: true }).check();
  await page.getByRole("tab", { name: /Membres/ }).click();
  await page.getByLabel("future@example.org", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const saveStatus = page.locator("header").getByRole("status");
  await expect(saveStatus).toHaveText("Groupe enregistré");
  await expect(page.locator("main .fr-alert--success")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 640 });
  await expect(saveStatus).toBeInViewport();
  await expect(
    page.locator("header").getByRole("button", { name: "Créer un groupe" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(saveStatus).toBeEmpty({ timeout: 5000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const [group] = await db("groupe_instructeurs").where({ name: "Service Paris" });
  expect(
    await db("groupe_departement").where({ groupe_instructeurs: group.id }).pluck("department"),
  ).toEqual(["75"]);
  expect(await db("user_groupe").where({ groupe_instructeurs: group.id }).pluck("user_id")).toEqual(
    [user.id],
  );

  const activeSection = page.getByRole("region", { name: "Actifs", exact: true });
  await activeSection.getByRole("button", { name: "Modifier Service Paris", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Modifier Service Paris" })).toBeVisible();
  await page.getByLabel("Nom du groupe").fill("Unsaved name");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await activeSection.getByRole("button", { name: "Modifier Service Paris", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Nom du groupe")).toHaveValue("Service Paris");
  await page.getByRole("searchbox", { name: "Rechercher un département" }).fill("paris");
  await expect(page.getByLabel("75 · Paris", { exact: true })).toBeChecked();
  await page.getByRole("tab", { name: /Membres/ }).click();
  await expect(page.getByLabel("future@example.org", { exact: true })).toBeChecked();
  await page.getByLabel("Groupe actif", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Archivés", exact: true })).toContainText(
    "Service Paris",
  );
  await expect(page.locator("main section[aria-label] > header > h2")).toHaveText([
    /À vérifier/,
    /Actifs/,
    /Archivés/,
  ]);

  await page.goto(`${E2E_ADMIN_BASE_URL}/utilisateurs`);
  await page.getByRole("button", { name: "Modifier future@example.org", exact: true }).click();
  await page.getByRole("dialog").locator("summary").click();
  await page
    .getByRole("combobox", {
      name: "Exception : Instruire les dossiers de ses groupes",
      exact: true,
    })
    .click();
  await page.getByRole("option", { name: "Refuser", exact: true }).click();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Utilisateur enregistré");
  expect(
    await db("auth_permission_exclusion").where({ user_id: user.id }).pluck("permission"),
  ).toEqual(["dossier:instruct"]);
});

test("group member pagination preserves selections across pages, searches and tabs", async ({
  page,
  db,
  loginAs,
}) => {
  const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  const users = await db("auth_user")
    .insert(
      Array.from({ length: 19 }, (_, i) => ({
        email: `member${String(i + 1).padStart(2, "0")}@example.org`,
      })),
    )
    .returning("*");
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/groupes-instructeurs`);
  await page.getByRole("button", { name: "Créer un groupe", exact: true }).click();
  const name = page.getByLabel("Nom du groupe");
  await expect(name).toHaveAttribute("autocomplete", "off");
  await expect(name).toHaveAttribute("data-form-type", "other");
  await name.fill("Service paginé");
  const membersTab = page.getByRole("tab", { name: /Membres/ });
  await membersTab.hover();
  await expect(membersTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await membersTab.click();
  await expect(page.locator(".member-list input")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Page précédente des membres" })).toBeDisabled();
  await page.getByLabel("member01@example.org", { exact: true }).check();
  await page.getByRole("button", { name: "Page suivante des membres" }).click();
  await expect(page.getByRole("navigation", { name: "Pagination des membres" })).toContainText(
    "Page 2 / 2",
  );
  await expect(page.getByRole("button", { name: "Page suivante des membres" })).toBeDisabled();
  await page.getByLabel("member18@example.org", { exact: true }).check();
  const search = page.getByRole("searchbox", { name: "Rechercher un membre" });
  await search.fill("member01");
  await expect(page.getByLabel("member01@example.org", { exact: true })).toBeChecked();
  await search.fill("no match");
  await expect(page.getByText("Aucun utilisateur trouvé.")).toBeVisible();
  await search.fill("");
  await expect(page.getByRole("navigation", { name: "Pagination des membres" })).toContainText(
    "Page 1 / 2",
  );
  await page.getByRole("tab", { name: /Départements/ }).click();
  const departmentSearch = page.getByRole("searchbox", { name: "Rechercher un département" });
  await departmentSearch.fill("paris");
  await page.getByLabel("75 · Paris", { exact: true }).check();
  await departmentSearch.fill("gironde");
  await page.getByLabel("33 · Gironde", { exact: true }).check();
  await departmentSearch.fill("paris");
  await expect(page.getByLabel("75 · Paris", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.locator("header").getByRole("status")).toContainText("Groupe enregistré");
  const group = await db("groupe_instructeurs").where({ name: "Service paginé" }).first();
  const selected = await db("user_groupe")
    .where({ groupe_instructeurs: group.id })
    .pluck("user_id");
  expect(
    await db("groupe_departement")
      .where({ groupe_instructeurs: group.id })
      .orderBy("department")
      .pluck("department"),
  ).toEqual(["33", "75"]);
  expect(selected.sort()).toEqual(
    users
      .filter((user) => ["member01@example.org", "member18@example.org"].includes(user.email))
      .map((user) => user.id)
      .sort(),
  );
});
