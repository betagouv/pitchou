import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getObjectStorageClient, getBucket } from "$server/object-storage.ts";

export const GET: RequestHandler = async ({ url }) => {
  if (process.env.NODE_ENV === "production") error(404);

  const key = url.searchParams.get("key");
  if (!key) error(400, "Missing 'key' query parameter");

  const result = await getObjectStorageClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );

  if (!result.Body) error(404, "Object body is empty");

  const stream = result.Body.transformToWebStream();
  const filename = key.split("/").pop() ?? "download";

  const headers: Record<string, string> = {
    "Content-Type": result.ContentType ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
  if (result.ContentLength) headers["Content-Length"] = String(result.ContentLength);

  return new Response(stream, { headers });
};
