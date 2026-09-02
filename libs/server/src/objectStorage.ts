import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

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

export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType?: string | null,
): Promise<void> {
  await getObjectStorageClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType ?? "application/octet-stream",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getObjectStorageClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}

export async function listObjectKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const result = await getObjectStorageClient().send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const object of result.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

export async function getObject(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  const result = await getObjectStorageClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );
  if (!result.Body) {
    throw new Error(`S3 object ${key} has no body`);
  }
  return {
    body: result.Body as Readable,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}
