import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | undefined;
let cachedBucket: string | undefined;

const FILES_PREFIX = "files/";

export function getObjectStorageClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({ forcePathStyle: true });
  return cachedClient;
}

export function getBucket(): string {
  if (cachedBucket) return cachedBucket;
  const value = process.env.S3_BUCKET;
  if (!value) throw new TypeError("Environment variable S3_BUCKET is missing");
  cachedBucket = value;
  return cachedBucket;
}

export function fileKey(id: string): string {
  return `${FILES_PREFIX}${id}`;
}
