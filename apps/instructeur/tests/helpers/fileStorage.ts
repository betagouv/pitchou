import { GetObjectCommand, HeadObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { getTestS3 } from "../setup/s3.ts";

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
