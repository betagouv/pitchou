import { afterAll, beforeEach } from "vitest";
import { db } from "./db.ts";
import { truncateAll } from "./truncate.ts";
import { emptyTestBucket } from "./init-test-s3.ts";

// Schema resets fsync many relations. A premature timeout lets the unfinished
// TRUNCATE overlap the next test and can cause misleading lock failures.
beforeEach(async () => {
  await truncateAll(db);
  await emptyTestBucket();
}, 60_000);

afterAll(async () => {
  await db.destroy();
}, 30_000);
