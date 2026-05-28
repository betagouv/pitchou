import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getObjectStorageClient, getBucket } from "$server/object-storage.ts";

function ensureNotProduction() {
  if (process.env.NODE_ENV === "production") error(404);
}

export const GET: RequestHandler = async () => {
  ensureNotProduction();

  const result = await getObjectStorageClient().send(
    new ListObjectsV2Command({ Bucket: getBucket() }),
  );

  const objects = (result.Contents ?? []).map((o) => ({
    key: o.Key,
    size: o.Size ?? 0,
    lastModified: o.LastModified?.toISOString() ?? null,
  }));

  return json({ objects });
};

export const POST: RequestHandler = async ({ request }) => {
  ensureNotProduction();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    error(400, "Missing 'file' in form data");
  }

  const key = `test-uploads/${crypto.randomUUID()}`;
  const body = new Uint8Array(await file.arrayBuffer());

  await getObjectStorageClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return json({ key, size: file.size, name: file.name });
};

export const DELETE: RequestHandler = async ({ url }) => {
  ensureNotProduction();

  const key = url.searchParams.get("key");
  if (!key) error(400, "Missing 'key' query parameter");

  await getObjectStorageClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );

  return new Response(null, { status: 204 });
};
