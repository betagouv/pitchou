import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { E2E_ADMIN_BASE_URL } from "../setup/e2e-global.ts";

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 640 },
]) {
  test(`admin scrolling stays inside the shell at ${viewport.width}px`, async ({
    page,
    db,
    loginAs,
  }) => {
    await page.setViewportSize(viewport);
    const administrator = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
    await db("auth_permission_bundle").insert({
      user_id: administrator.id,
      bundle: "administrateur",
    });
    // Multiple long sections put hidden captions below the viewport. Without a positioned
    // scroll container, those absolute captions overflow the document instead of the panel.
    await db("groupe_instructeurs").insert(
      Array.from({ length: 40 }, (_, i) => ({
        name: `Groupe ${String(i).padStart(2, "0")}`,
        coverage_needs_review: false,
        active: i < 20,
      })),
    );
    await db("auth_user").insert(
      Array.from({ length: 30 }, (_, i) => ({ email: `layout${i}@example.org` })),
    );
    await loginAs(administrator.codeAcces);

    for (const [path, title] of [
      ["groupes-instructeurs", "Groupes instructeurs"],
      ["utilisateurs", "Utilisateurs"],
    ]) {
      await page.goto(`${E2E_ADMIN_BASE_URL}/${path}`);
      const heading = page.getByRole("heading", { level: 1, name: title });
      await expect(heading).toBeVisible();
      await page.evaluate(() => {
        document.querySelector("main")!.parentElement!.scrollTop = 100000;
        window.scrollTo(0, 100000);
      });
      // Continue wheeling after the content reaches its bottom, as in the reported issue.
      await page.mouse.move(viewport.width - 30, viewport.height - 30);
      await page.mouse.wheel(0, 1000);
      await expect(heading).toBeInViewport();
      const bounds = await page.evaluate(() => {
        const panel = document.querySelector("main")!.parentElement!;
        return {
          documentHeight: document.documentElement.scrollHeight,
          windowScroll: window.scrollY,
          panelScroll: panel.scrollTop,
          panelBottom: panel.getBoundingClientRect().bottom,
          headerTop: document.querySelector("h1")!.closest("header")!.getBoundingClientRect().top,
        };
      });
      expect(bounds.documentHeight).toBe(viewport.height);
      expect(bounds.windowScroll).toBe(0);
      expect(bounds.panelScroll).toBeGreaterThan(0);
      expect(bounds.panelBottom).toBe(viewport.height);
      expect(bounds.headerTop).toBe(0);
      if (viewport.width >= 1024) await expect(page.locator("#admin-sidebar")).toBeInViewport();
      if (path === "groupes-instructeurs") {
        const lastGroup = page.getByRole("button", { name: "Modifier Groupe 39", exact: true });
        await expect(lastGroup).toBeInViewport();
        await lastGroup.click();
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByRole("button", { name: "Enregistrer", exact: true }),
        ).toBeInViewport();
        await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
        await expect(heading).toBeInViewport();
      }
    }
  });
}
