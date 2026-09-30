// Configures the bucket of the current environment for browser uploads.
// Runs with plain Node (no build step), locally and in a Scalingo container:
//   corepack pnpm --filter @pitchou/server exec node scripts/setup-bucket.ts <origin>...
import { configureUploadBucket } from "../src/bucketSetup.ts";

try {
  const { bucket, cors, lifecycle } = await configureUploadBucket(process.argv.slice(2));
  console.log(`✔ bucket ${bucket} configuré`);
  console.log("CORS :", JSON.stringify(cors));
  console.log("Cycle de vie :", JSON.stringify(lifecycle));
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
