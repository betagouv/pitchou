export function resolveAppOrigin(
  app: "admin" | "instructeur",
  environment: Record<string, string | undefined>,
): string | undefined {
  const value = environment[`ORIGIN_${app.toUpperCase()}`] || environment.ORIGIN;
  if (!value) return undefined;
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(`Invalid public origin for ${app}: expected an HTTP(S) origin`);
  }
  return url.origin;
}

export function hasExpectedOrigin(
  request: Request,
  url: URL,
  configuredOrigin: string | null,
): boolean {
  return request.headers.get("origin") === (configuredOrigin ?? url.origin);
}
