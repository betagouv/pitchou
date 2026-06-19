import { setTimeout as sleep } from "node:timers/promises";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

const S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://127.0.0.1:9100";
const S3_REGION = "us-east-1"; // RustFS accepts any AWS region; SDK requires one
const S3_ACCESS_KEY = process.env.TEST_S3_ACCESS_KEY ?? "rustfsadmin";
const S3_SECRET_KEY = process.env.TEST_S3_SECRET_KEY ?? "rustfsadmin";

export const TEST_BUCKET = "pitchou-test";

export type TestS3Credentials = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

let cachedClient: S3Client | undefined;
let cachedCreds: TestS3Credentials | undefined;

function makeClient(creds: TestS3Credentials): S3Client {
  return new S3Client({
    endpoint: creds.endpoint,
    region: creds.region,
    forcePathStyle: true,
    credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
  });
}

async function waitForS3Ready(client: S3Client, bucket: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
      return;
    } catch (e) {
      // The bucket may not exist yet — that's normal during bootstrap, treat
      // "NoSuchBucket" as "server is up" and let the caller create the bucket.
      if (e instanceof S3ServiceException) return;
      lastError = e;
    }
    await sleep(200);
  }
  throw new Error(`Test S3 endpoint not ready in ${timeoutMs}ms: ${String(lastError)}`);
}

async function ensureBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (err) {
    if (err instanceof S3ServiceException) {
      const code = err.name;
      if (code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists") return;
    }
    throw err;
  }
}

/**
 * Bootstraps the local RustFS container (creates the test bucket if needed),
 * caches the credentials, and returns them. Also sets the AWS_* / S3_* env
 * vars on the current process so any later code that reads them (the
 * SvelteKit child, the AWS SDK in this process) picks them up automatically.
 */
export async function initTestS3(): Promise<TestS3Credentials> {
  if (cachedCreds) return cachedCreds;

  const creds: TestS3Credentials = {
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
    bucket: TEST_BUCKET,
  };
  const client = makeClient(creds);
  await waitForS3Ready(client, creds.bucket);
  await ensureBucket(client, creds.bucket);

  process.env.AWS_ENDPOINT_URL_S3 = creds.endpoint;
  process.env.AWS_REGION = creds.region;
  process.env.AWS_ACCESS_KEY_ID = creds.accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = creds.secretAccessKey;
  process.env.S3_BUCKET = creds.bucket;

  cachedClient = client;
  cachedCreds = creds;
  return creds;
}

/**
 * Deletes every object under the test bucket. Safe to call between test files
 * to start from a clean slate without re-running the bootstrap.
 */
export async function emptyTestBucket(): Promise<void> {
  const creds = await initTestS3();
  const client = cachedClient ?? makeClient(creds);
  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: creds.bucket, ContinuationToken: continuationToken }),
    );
    for (const obj of list.Contents ?? []) {
      if (obj.Key) {
        await client.send(new DeleteObjectCommand({ Bucket: creds.bucket, Key: obj.Key }));
      }
    }
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);
}
