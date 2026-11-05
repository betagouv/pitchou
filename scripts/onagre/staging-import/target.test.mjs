import test from "node:test";
import assert from "node:assert/strict";
import { assertStagingTarget, target } from "./target.mjs";
const env = {
  PUBLIC_PITCHOU_ENV: "staging",
  PITCHOU_APP: "instructeur",
  STAGING_EMAIL_ALLOWLIST: "demo@example.org",
  DATABASE_URL: `postgres://${target.database}:secret@${target.host}:${target.port}/${target.database}?sslmode=require`,
  S3_BUCKET: target.bucket,
  AWS_ENDPOINT_URL_S3: target.endpoint,
};
test("accepts only the pinned staging target with email protection", () => {
  assert.equal(assertStagingTarget(env).hostname, target.host);
  for (const change of [
    { PUBLIC_PITCHOU_ENV: "production" },
    { PITCHOU_APP: "admin" },
    { STAGING_EMAIL_ALLOWLIST: "" },
    { STAGING_RESET_DATA: "true" },
    { ONAGRE_DEPLOYMENT_ROLE: "workspace" },
    { S3_BUCKET: "pitchou-production" },
    { AWS_ENDPOINT_URL_S3: "https://example.org" },
    {
      DATABASE_URL: env.DATABASE_URL.replace(target.host, "production.internal"),
    },
    {
      DATABASE_URL: env.DATABASE_URL.replace(`/${target.database}?`, "/other?"),
    },
  ])
    assert.throws(() => assertStagingTarget({ ...env, ...change }));
});
