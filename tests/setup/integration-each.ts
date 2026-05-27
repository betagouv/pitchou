import { afterAll, beforeEach } from "vitest";
import { db } from "./db.ts";
import { truncateAll } from "./truncate.ts";

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.destroy();
});
