import { test, expect } from "../fixtures/playwright.ts";
import { createAdminAccessFixture } from "../helpers/adminAccess.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";
import { chooseInSelect } from "../helpers/select.ts";

for (const width of [1280, 320]) {
  test(`access drafts require saving and survive errors at ${width}px`, async ({
    page,
    db,
    loginAs,
  }, testInfo) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    const { actor, member, dossier, manual, excluded, archived, newcomer } =
      await createAdminAccessFixture(db);
    await loginAs(actor.codeAcces);
    await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
    await expect(page.locator("html")).toHaveAttribute("data-fr-theme", "dark");
    await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
    const groups = page.getByRole("region", { name: "Affectations aux groupes instructeurs" });
    const people = page.getByRole("region", { name: "Accès individuels au dossier" });
    const group = groups.getByRole("article", { name: manual.name, exact: true });
    const person = people.getByRole("article", { name: `Accès de ${member.email}`, exact: true });
    const groupEdit = group.getByRole("button", {
      name: `Modifier l'affectation de ${manual.name}`,
    });
    const personEdit = person.getByRole("button", { name: `Modifier l'accès de ${member.email}` });
    const groupForm = group.getByRole("form");
    const personForm = person.getByRole("form");
    const groupKey = { dossier: dossier.id, groupe_instructeurs: manual.id };
    const personKey = { dossier: dossier.id, user_id: member.id };
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        /\/(affectations|acces-utilisateurs)$/u.test(request.url())
      )
        writes.push(request.url());
    });
    await expect(groups.getByRole("article", { name: archived.name, exact: true })).toContainText(
      "Archivé",
    );
    await expect(groups.getByRole("article", { name: excluded.name, exact: true })).toContainText(
      "Exclu",
    );
    const inactiveRow = people.getByRole("article", {
      name: "Accès de compte.inactif@example.org",
    });
    await expect(inactiveRow).toContainText("Compte inactif");
    await expect(inactiveRow).toContainText("Accès effectif : Aucun accès");
    await expect(person).toContainText(
      "Accès effectif : Instruction. Il dépend des groupes et des permissions du compte.",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await groups
      .getByRole("heading", { name: "Groupes instructeurs", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-groups-overview-${width}.png`) });
    await people.getByRole("heading", { name: "Personnes", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-people-overview-${width}.png`) });

    await groupEdit.click();
    await chooseInSelect(groupForm.getByRole("combobox"), "Exclure durablement");
    await expect(groupForm).toContainText(
      "L'exclusion retire uniquement l'accès apporté par ce groupe",
    );
    await personEdit.click();
    await personForm.getByRole("radio", { name: /^Instruction/u }).check();
    await expect(
      personForm.getByRole("button", { name: /^Révoquer/u }),
    ).toHaveAccessibleDescription(
      "Retirer cet accès individuel ne retire pas les accès accordés par les groupes.",
    );
    await page.getByRole("tab", { name: "Dossier", exact: true }).click();
    await page.getByRole("tab", { name: "Accès au dossier", exact: true }).click();
    await expect(groupForm.getByRole("combobox")).toContainText("Exclure durablement");
    await expect(personForm.getByRole("radio", { name: /^Instruction/u })).toBeChecked();
    expect(writes).toHaveLength(0);
    expect(await db("dossier_group_override").where(groupKey).first()).toMatchObject({
      mode: "include",
      access_level: "read",
    });
    expect(await db("dossier_user_access").where(personKey).first()).toMatchObject({
      access_level: "read",
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await groupForm.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-groups-edit-${width}.png`) });
    await personForm.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-people-edit-${width}.png`) });
    await groupForm.getByRole("button", { name: "Annuler", exact: true }).click();
    await personForm.getByRole("button", { name: "Annuler", exact: true }).click();
    await groupEdit.click();
    await personEdit.click();
    await expect(groupForm.getByRole("combobox")).toContainText("Inclure manuellement");
    await expect(groupForm.getByRole("radio", { name: /^Lecture complète/u })).toBeChecked();
    await expect(personForm.getByRole("radio", { name: /^Lecture complète/u })).toBeChecked();
    expect(writes).toHaveLength(0);

    const groupEndpoint = `**/api/dossiers/${dossier.id}/affectations`;
    await page.route(groupEndpoint, (route) =>
      route.fulfill({ status: 503, json: { message: "Affectation temporairement indisponible" } }),
    );
    await chooseInSelect(groupForm.getByRole("combobox"), "Exclure durablement");
    await groupForm.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(groupForm.getByRole("alert")).toHaveText(
      "Affectation temporairement indisponible",
    );
    await expect(groupForm.getByRole("combobox")).toContainText("Exclure durablement");
    expect(writes).toHaveLength(1);
    expect(await db("dossier_group_override").where(groupKey).first()).toMatchObject({
      mode: "include",
    });
    await page.unroute(groupEndpoint);
    await groupForm.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(groupForm).toHaveCount(0);
    await expect(group).toContainText("Exclusion manuelle");
    expect(await db("dossier_group_override").where(groupKey).first()).toMatchObject({
      mode: "exclude",
    });

    const personEndpoint = `**/api/dossiers/${dossier.id}/acces-utilisateurs`;
    await page.route(personEndpoint, (route) =>
      route.fulfill({ status: 503, json: { message: "Accès temporairement indisponible" } }),
    );
    await personForm.getByRole("radio", { name: /^Instruction/u }).check();
    await personForm.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(personForm.getByRole("alert")).toHaveText("Accès temporairement indisponible");
    await expect(personForm.getByRole("radio", { name: /^Instruction/u })).toBeChecked();
    expect(writes).toHaveLength(3);
    expect(await db("dossier_user_access").where(personKey).first()).toMatchObject({
      access_level: "read",
    });
    await page.unroute(personEndpoint);
    await personForm.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(personForm).toHaveCount(0);
    await expect(person.getByText("Instruction", { exact: true })).toBeVisible();
    await expect(person.getByText(/^Accès effectif/u)).toHaveCount(0);
    expect(writes).toHaveLength(4);
    expect(await db("dossier_user_access").where(personKey).first()).toMatchObject({
      access_level: "instruct",
    });

    await groups.getByRole("button", { name: "Ajouter un groupe", exact: true }).click();
    const addGroup = groups.getByRole("form", { name: "Ajouter un groupe", exact: true });
    const picker = addGroup.getByRole("combobox", { name: /^Groupe instructeur/u });
    await picker.focus();
    await page.keyboard.press("ArrowDown");
    const search = page.getByRole("searchbox", { name: "Groupe instructeur", exact: true });
    await expect(search).toBeFocused();
    await search.fill("introuvable");
    await expect(page.getByRole("option", { name: "Aucun résultat", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(picker).toBeFocused();
    await page.keyboard.press("Enter");
    await search.fill("Consultation complémentaire");
    await page.keyboard.press("Enter");
    await expect(picker).toContainText("Consultation complémentaire");
    await expect(picker).toBeFocused();
    await people.getByRole("button", { name: "Ajouter une personne", exact: true }).click();
    const addPerson = people.getByRole("form", {
      name: "Ajouter un accès individuel",
      exact: true,
    });
    await addPerson.getByRole("combobox", { name: /^Personne/u }).click();
    await page.getByRole("searchbox", { name: "Personne", exact: true }).fill("nouvelle.personne");
    await page.getByRole("option", { name: "nouvelle.personne@example.org", exact: true }).click();
    await addPerson.getByRole("radio", { name: /^Instruction/u }).check();
    expect(writes).toHaveLength(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await addGroup.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-groups-add-${width}.png`) });
    await addPerson.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`access-people-add-${width}.png`) });
    await addGroup.getByRole("button", { name: "Annuler", exact: true }).click();
    await addPerson.getByRole("button", { name: "Annuler", exact: true }).click();
    expect(writes).toHaveLength(4);
    expect(
      await db("dossier_user_access").where({ dossier: dossier.id, user_id: newcomer.id }),
    ).toHaveLength(0);
  });
}
