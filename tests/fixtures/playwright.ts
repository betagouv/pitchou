import { test as base } from "@playwright/test";
import type { Knex } from "knex";
import { E2E_DB_NAME, makeKnex } from "../setup/db.ts";
import { truncateAll } from "../setup/truncate.ts";

type Fixtures = {
  db: Knex;
  loginAs: (codeAcces: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  // One knex connection per worker. Reused across tests in the same worker;
  // truncated at the start of every test for a clean slate.
  // eslint-disable-next-line no-empty-pattern
  db: [
    async ({}, use) => {
      const db = makeKnex(E2E_DB_NAME);
      await truncateAll(db);
      await use(db);
      await db.destroy();
    },
    { scope: "test" },
  ],

  loginAs: async ({ page }, use) => {
    await use(async (codeAcces: string) => {
      await page.addInitScript((secret) => {
        // `remember` (lib used by the app) stores plain strings verbatim and
        // tries JSON.parse on read. Either form works; we use the JSON form
        // so it round-trips identically.
        localStorage.setItem("secret-pitchou", JSON.stringify(secret));
      }, codeAcces);
    });
  },
});

export { expect } from "@playwright/test";
