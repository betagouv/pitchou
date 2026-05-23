import { vi } from "vitest";

// `scripts/server/database.js` throws at module load when DATABASE_URL is unset (which it always is in tests). Tests inject their own fake knex connection, so the real one is never used. Stub it here so importing it never fires the side-effect.
vi.mock("./scripts/server/database.js", () => ({
  directDatabaseConnection: undefined,
}));
