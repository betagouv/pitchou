import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";

const directories: string[] = [];
export function environmentFixture() {
  const checkout = mkdtempSync(join(tmpdir(), "pitchou-preview-"));
  directories.push(checkout);
  const root = join(checkout, "apps/instructeur");
  mkdirSync(root, { recursive: true });
  const identifier = "a".repeat(32);
  const contextPath = join(checkout, "context.json");
  writeFileSync(
    contextPath,
    JSON.stringify({
      checkout,
      bucket: `pitchou-${identifier}`,
      accounts: [{ email: "a@test.fr" }, { email: "b@test.fr" }],
    }),
  );
  const env = {
    NODE_ENV: "development",
    FLEET_PITCHOU_CONTEXT: contextPath,
    MAILPIT_URL: "http://127.0.0.1:8025/__fleet/mail/",
    PUBLIC_SITE_URL_PITCHOU: `https://p-${identifier}-instructeur.preview.nicolascura.com`,
    DATABASE_URL: `postgresql://pitchou_${identifier}:test@127.0.0.1:55432/pitchou_${identifier}`,
  };
  return { root, env };
}
afterEach(() =>
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true })),
);
