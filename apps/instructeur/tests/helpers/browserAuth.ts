import type { Page } from "@playwright/test";
import type { Knex } from "knex";
import { createCapDossier } from "../factories/cap.ts";
import { E2E_BASE_URL } from "../setup/e2e-global.ts";

export async function setBrowserSession(page: Page, db: Knex, codeAcces: string) {
  const { cap } = await createCapDossier(db, codeAcces);
  await page
    .context()
    .addCookies([
      { name: "pitchou_session", value: cap, url: E2E_BASE_URL, httpOnly: true, sameSite: "Lax" },
    ]);
}
export async function loginBrowser(page: Page, db: Knex, codeAcces: string, path = "/") {
  await setBrowserSession(page, db, codeAcces);
  await page.goto(path);
}
