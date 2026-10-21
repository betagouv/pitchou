import { expect, test } from "vitest";
import { localInboxUrl, previewEnvironment } from "./environment.ts";
import { environmentFixture } from "./environmentFixture.ts";

test("enables the tool only for a matching isolated preview and local capture", () => {
  const { root, env } = environmentFixture();
  expect(previewEnvironment(root, env)).toMatchObject({
    siteUrl: env.PUBLIC_SITE_URL_PITCHOU,
    inboxUrl: env.MAILPIT_URL,
    accounts: ["a@test.fr", "b@test.fr"],
  });
});
test.each(["production", "test", ""])("does not enable the tool in %s", (NODE_ENV) => {
  expect(previewEnvironment("/missing", { NODE_ENV })).toBeUndefined();
});
test("is absent in normal development without preview context or capture", () => {
  expect(previewEnvironment("/missing", { NODE_ENV: "development" })).toBeUndefined();
  expect(
    previewEnvironment("/missing", { NODE_ENV: "development", FLEET_PITCHOU_CONTEXT: "/missing" }),
  ).toBeUndefined();
});
test.each([
  { DATABASE_URL: "postgresql://dev@127.0.0.1/pitchou" },
  { DATABASE_URL: `postgresql://pitchou_${"a".repeat(32)}@db.example/pitchou_${"a".repeat(32)}` },
  { PUBLIC_SITE_URL_PITCHOU: "https://pitchou.beta.gouv.fr" },
  { MAILPIT_URL: "https://api.brevo.com" },
])("rejects unsafe preview settings %j", (changes) => {
  const { root, env } = environmentFixture();
  expect(() => previewEnvironment(root, { ...env, ...changes })).toThrow();
});
test.each([
  "https://127.0.0.1:8025",
  "http://localhost:8025",
  "http://remote.test",
  "http://user@127.0.0.1:8025",
  "http://127.0.0.1:8025?redirect=external",
])("rejects non-local or ambiguous inbox %s", (value) => {
  expect(() => localInboxUrl(value)).toThrow();
});
