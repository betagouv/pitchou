import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";

let cachedClient: S3Client | undefined;
let cachedPresignClient: S3Client | undefined;
let cachedBucket: string | undefined;

const FILES_PREFIX = "files/";
/** Objects the browser uploaded but the app has not registered yet. A bucket lifecycle rule expires them. */
const PENDING_PREFIX = "pending/";

/** How long a signed upload URL stays valid. */
export const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

export function getObjectStorageClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({ forcePathStyle: true });
  return cachedClient;
}

/**
 * Client used only to sign URLs the browser calls. Its endpoint must be
 * reachable from outside, which S3_PUBLIC_ENDPOINT_URL overrides when the
 * app talks to storage through a private address.
 */
function getPresignClient(): S3Client {
  if (cachedPresignClient) return cachedPresignClient;
  const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT_URL;
  cachedPresignClient = publicEndpoint
    ? new S3Client({ forcePathStyle: true, endpoint: publicEndpoint })
    : getObjectStorageClient();
  return cachedPresignClient;
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

export function pendingKey(id: string): string {
  return `${PENDING_PREFIX}${id}`;
}

/**
 * Signs a PUT URL for `key`. The byte count is part of the signature, so
 * storage refuses a body of any other size.
 */
export function createUploadUrl(key: string, contentLength: number): Promise<string> {
  return getSignedUrl(
    getPresignClient(),
    new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentLength: contentLength }),
    { expiresIn: UPLOAD_URL_EXPIRY_SECONDS },
  );
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

/** Returns the object's size and content type, or null when it does not exist. */
export async function headObject(
  key: string,
): Promise<{ contentLength: number; contentType?: string } | null> {
  try {
    const result = await getObjectStorageClient().send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    return { contentLength: result.ContentLength ?? 0, contentType: result.ContentType };
  } catch (err) {
    if (err instanceof S3ServiceException && ["NotFound", "NoSuchKey"].includes(err.name)) {
      return null;
    }
    throw err;
  }
}

/** Server-side copy within the bucket; the bytes never leave storage. */
export async function copyObject(sourceKey: string, destinationKey: string): Promise<void> {
  await getObjectStorageClient().send(
    new CopyObjectCommand({
      Bucket: getBucket(),
      Key: destinationKey,
      CopySource: encodeURI(`${getBucket()}/${sourceKey}`),
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
