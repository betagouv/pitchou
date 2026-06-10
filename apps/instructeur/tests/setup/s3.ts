import { S3Client } from "@aws-sdk/client-s3";
import { initTestS3, type TestS3Credentials } from "./init-test-s3.ts";

let cachedClient: S3Client | undefined;
let cachedCreds: TestS3Credentials | undefined;

/**
 * Returns an S3 client wired to the local Garage container with the test
 * bucket already provisioned. Use this from integration / e2e tests when you
 * need to inspect or seed the bucket directly.
 */
export async function getTestS3(): Promise<{ client: S3Client; bucket: string }> {
  if (!cachedCreds) cachedCreds = await initTestS3();
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint: cachedCreds.endpoint,
      region: cachedCreds.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cachedCreds.accessKeyId,
        secretAccessKey: cachedCreds.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, bucket: cachedCreds.bucket };
}
