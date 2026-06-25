/** Reads a required environment variable, throwing a clear error when missing. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** The admin app's public base URL (used to build the ProConnect redirect URIs), without a trailing slash. */
export function getBaseUrl(): string {
  return requireEnv("PUBLIC_SITE_URL_ADMIN").replace(/\/+$/, "");
}
