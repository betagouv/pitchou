import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

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
  const membersTab = page.getByRole("tab", { name: /Membres/u });
  await membersTab.hover();
  await expect(membersTab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await membersTab.click();
  await expect(page.locator(".member-list input")).toHaveCount(10);
  await expect(page.getByRole("button", { name: "Page précédente des membres" })).toBeDisabled();
  await page.getByLabel("member01@example.org", { exact: true }).click();
  await page.getByRole("button", { name: "Page suivante des membres" }).click();
  await expect(page.getByRole("navigation", { name: "Pagination des membres" })).toContainText(
    "Page 2 / 2",
  );
  await expect(page.getByRole("button", { name: "Page suivante des membres" })).toBeDisabled();
  await page.getByLabel("member18@example.org", { exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Rechercher un membre" });
  const selectedMembers = page.getByRole("region", { name: "Membres sélectionnés" });
  await search.fill("member01");
  await expect(selectedMembers.getByRole("listitem")).toHaveCount(2);
  await expect(
    page.getByRole("checkbox", { name: "member01@example.org", exact: true }),
  ).toHaveCount(0);
  await selectedMembers
    .getByRole("button", { name: "Retirer member01@example.org", exact: true })
    .click();
  await expect(search).toBeFocused();
  await page.getByRole("checkbox", { name: "member01@example.org", exact: true }).click();
  await search.fill("no match");
  await expect(selectedMembers.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByText("Aucun utilisateur trouvé.")).toBeVisible();
  await search.fill("");
  await expect(page.getByRole("navigation", { name: "Pagination des membres" })).toContainText(
    "Page 1 / 2",
  );
  await page.getByRole("tab", { name: /Règles/u }).click();
  await page.getByRole("button", { name: "Ajouter une règle" }).click();
  await page.getByRole("combobox", { name: "Ajouter un critère à la règle 1" }).click();
  await page.getByRole("option", { name: "Département principal", exact: true }).click();
  await page.getByRole("button", { name: "Sélectionner des départements", exact: true }).click();
  await page.getByText("75 - Paris", { exact: true }).click();
  await page.getByText("33 - Gironde", { exact: true }).click();
  await expect(page.getByLabel("75 - Paris", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Vérifier les affectations" }).click();
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
