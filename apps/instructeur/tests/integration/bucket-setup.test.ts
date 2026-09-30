import { afterEach, expect, test } from "vitest";
import {
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { configureUploadBucket } from "@pitchou/server/bucketSetup.ts";
import { getTestS3 } from "../setup/s3.ts";

// The e2e browser relies on the permissive CORS the test bootstrap sets.
afterEach(async () => {
  const { client, bucket } = await getTestS3();
  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["*"],
            AllowedMethods: ["PUT"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
});

test("configureUploadBucket applique CORS et expiration de pending/ au bucket", async () => {
  const { client, bucket } = await getTestS3();
  const origins = ["https://a.example", "https://b.example"];

  const result = await configureUploadBucket(origins);

  expect(result.bucket).toBe(bucket);
  const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  expect(cors.CORSRules).toEqual([
    expect.objectContaining({ AllowedOrigins: origins, AllowedMethods: ["PUT"] }),
  ]);
  const lifecycle = await client.send(
    new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
  );
  expect(lifecycle.Rules).toEqual([
    expect.objectContaining({
      ID: "expire-pending-uploads",
      Status: "Enabled",
      Filter: { Prefix: "pending/" },
      Expiration: { Days: 1 },
    }),
  ]);
});
