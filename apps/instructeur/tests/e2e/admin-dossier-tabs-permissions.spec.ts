import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { expect, test } from "../fixtures/playwright.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

test("simulation stays unavailable without its permission", async ({ page, db, loginAs }) => {
  const administrator = await createInstructeurWithCapToGroup(db);
  await db("auth_permission_bundle").insert({
    user_id: administrator.id,
    bundle: "administrateur",
  });
  await changeDossierAccess(db, (routingTrx) =>
    routingTrx("auth_permission_exclusion").insert({
      user_id: administrator.id,
      permission: "admin:sync:simulate",
    }),
  );
  const dossier = await createDossier(db);
  await loginAs(administrator.codeAcces);
  await page.goto(`${E2E_ADMIN_BASE_URL}/dossiers/${dossier.id}`);
  await expect(page.getByRole("tablist").getByRole("tab")).toHaveText([
    "Dossier",
    "Accès au dossier",
  ]);
  await expect(page.locator("#simulation-valeur")).toHaveCount(0);
});
