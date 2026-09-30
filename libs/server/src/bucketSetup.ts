import { createHash } from "node:crypto";
import {
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { CORSRule, LifecycleRule } from "@aws-sdk/client-s3";

import { getBucket } from "./objectStorage.ts";

/**
 * Client for bucket-configuration calls. Outscale OOS only accepts them with
 * a Content-MD5 header, which the SDK no longer sends (it uses CRC32), so the
 * middleware swaps one for the other.
 */
function createBucketConfigClient(): S3Client {
  const client = new S3Client({
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  client.middlewareStack.add(
    (next) => async (args) => {
      const request = args.request as { headers: Record<string, string>; body?: string };
      for (const header of Object.keys(request.headers)) {
        if (/^x-amz-(sdk-)?checksum-/i.test(header)) delete request.headers[header];
      }
      if (request.body) {
        request.headers["Content-MD5"] = createHash("md5")
          .update(Buffer.from(request.body))
          .digest("base64");
      }
      return next(args);
    },
    { step: "build", priority: "low" },
  );
  return client;
}

/** `https://host[:port]`, nothing after: what a browser sends as Origin. */
export function assertOrigins(origins: string[]): void {
  if (origins.length === 0) {
    throw new TypeError("Au moins une origine est requise (ex. https://pitchou.beta.gouv.fr).");
  }
  for (const origin of origins) {
    let parsed: URL | undefined;
    try {
      parsed = new URL(origin);
    } catch {
      // handled below
    }
    if (!parsed || !/^https?:$/.test(parsed.protocol) || parsed.origin !== origin) {
      throw new TypeError(
        `Origine invalide : '${origin}'. Attendu : schéma et hôte seuls, sans chemin ni barre finale.`,
      );
    }
  }
}

/**
 * Configures the bucket (`S3_BUCKET`) for browser uploads: PUT allowed from
 * `origins`, and objects left under `pending/` deleted after a day. Replaces
 * the bucket's existing CORS and lifecycle configuration, then returns what
 * the bucket now reports.
 */
export async function configureUploadBucket(
  origins: string[],
): Promise<{ bucket: string; cors: CORSRule[]; lifecycle: LifecycleRule[] }> {
  assertOrigins(origins);
  const client = createBucketConfigClient();
  const Bucket = getBucket();

  await client.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["PUT"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "expire-pending-uploads",
            Status: "Enabled",
            Filter: { Prefix: "pending/" },
            Expiration: { Days: 1 },
          },
        ],
      },
    }),
  );

  const cors = await client.send(new GetBucketCorsCommand({ Bucket }));
  const lifecycle = await client.send(new GetBucketLifecycleConfigurationCommand({ Bucket }));
  return { bucket: Bucket, cors: cors.CORSRules ?? [], lifecycle: lifecycle.Rules ?? [] };
}
