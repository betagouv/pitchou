import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getTestS3 } from "../setup/s3.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export async function s3HasKey(key: string): Promise<boolean> {
  const { client, bucket } = await getTestS3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error instanceof S3ServiceException && ["NotFound", "NoSuchKey"].includes(error.name)) {
      return false;
    }
    throw error;
  }
}

export async function readS3Body(key: string): Promise<string> {
  const { client, bucket } = await getTestS3();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Missing S3 body for ${key}`);
  return response.Body.transformToString();
}

/**
 * Puts `bytes` under `pending/<uuid>` the way the browser does through a
 * signed URL, and returns the reference the API expects in its JSON body.
 */
export async function putPendingUpload(
  bytes: Buffer | string,
  name: string,
  mediaType = "application/pdf",
): Promise<UploadedFichier> {
  const { client, bucket } = await getTestS3();
  const id = randomUUID() as FileId;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `pending/${id}`,
      Body: bytes,
      ContentType: mediaType,
    }),
  );
  return { id, name };
}
