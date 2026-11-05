import { createRequire } from "node:module";
import { assertStagingTarget, target } from "./target.mjs";
import { mediaType } from "../local-import/species.mjs";
const { S3Client, PutObjectCommand } = createRequire(
  new URL("../../../libs/server/package.json", import.meta.url),
)("@aws-sdk/client-s3");

export function storage(env) {
  assertStagingTarget(env);
  const client = new S3Client({
    endpoint: target.endpoint,
    forcePathStyle: true,
    maxAttempts: 3,
  });
  async function put(Key, Body, ContentType) {
    await client.send(new PutObjectCommand({ Bucket: target.bucket, Key, Body, ContentType }), {
      abortSignal: AbortSignal.timeout(30000),
    });
  }
  return {
    async upload(files) {
      for (const file of files) await put(`files/${file.result.targetId}`, file.body, mediaType);
    },
    async report(hash, value) {
      await put(
        `onagre-import/${hash}/${value.mode}.json`,
        JSON.stringify(value),
        "application/json",
      );
    },
    close() {
      client.destroy();
    },
  };
}
