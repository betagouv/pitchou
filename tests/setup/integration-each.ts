import { afterAll, beforeEach } from "vitest";
import { db } from "./db.ts";
import { truncateAll } from "./truncate.ts";
import { emptyTestBucket } from "./init-test-s3.ts";

beforeEach(async () => {
  await truncateAll(db);
  await emptyTestBucket();
});

afterAll(async () => {
  await db.destroy();
});
