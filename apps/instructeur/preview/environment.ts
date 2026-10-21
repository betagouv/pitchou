import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

export function localInboxUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Fleet email tests require a local Mailpit inbox");
  return url;
}

export function previewEnvironment(root: string, env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "development" || !env.FLEET_PITCHOU_CONTEXT || !env.MAILPIT_URL) return;
  const context = JSON.parse(readFileSync(env.FLEET_PITCHOU_CONTEXT, "utf8"));
  const site = new URL(env.PUBLIC_SITE_URL_PITCHOU ?? "");
  const database = new URL(env.DATABASE_URL ?? "");
  const identifier = /^pitchou-([a-f0-9]{32})$/u.exec(context.bucket)?.[1];
  if (
    !identifier ||
    realpathSync(context.checkout) !== realpathSync(resolve(root, "../..")) ||
    site.origin !== `https://p-${identifier}-instructeur.preview.nicolascura.com` ||
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    database.hostname !== "127.0.0.1" ||
    database.pathname !== `/pitchou_${identifier}` ||
    database.username !== `pitchou_${identifier}` ||
    !Array.isArray(context.accounts) ||
    context.accounts.length !== 2 ||
    context.accounts.some((account: { email?: unknown }) => typeof account.email !== "string")
  )
    throw new Error("Fleet notification tools require this checkout's isolated preview");
  return {
    siteUrl: site.origin,
    inboxUrl: localInboxUrl(env.MAILPIT_URL).href,
    accounts: context.accounts.map((account: { email: string }) => account.email) as string[],
  };
}
