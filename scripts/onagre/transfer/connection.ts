import { createRequire } from "node:module";

export interface Connection {
  connect(): Promise<void>;
  end(): Promise<void>;
  on(event: "error", listener: () => void): void;
  query<Row = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: Row[]; rowCount: number | null }>;
}

// pg has no bundled declarations. Keep the small interface used by this standalone tool local.
const { Client } = createRequire(import.meta.url)("pg") as {
  Client: new (options: Record<string, unknown>) => Connection;
};

export function connectTo(connectionString: string): Connection {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    application_name: "pitchou-onagre-preparation-transfer",
  });
  // Query/connection promises report failures. Avoid printing pg's raw Error on idle disconnects.
  client.on("error", () => {});
  return client;
}

export class TransferRefusal extends Error {}

export function readOptions(args: string[], env: NodeJS.ProcessEnv) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply"))
    throw new TransferRefusal("Usage: transfer.ts [--apply]");
  if (env.ONAGRE_DEPLOYMENT_ROLE !== "rehearsal")
    throw new TransferRefusal("ONAGRE_DEPLOYMENT_ROLE must explicitly equal rehearsal.");
  const sourceUrl = parseUrl(env.ONAGRE_TRANSFER_SOURCE_URL);
  const targetUrl = parseUrl(env.DATABASE_URL);
  const expectedDatabase = env.ONAGRE_EXPECTED_DATABASE;
  if (!expectedDatabase || expectedDatabase !== decodeURIComponent(targetUrl.pathname.slice(1)))
    throw new TransferRefusal(
      "ONAGRE_EXPECTED_DATABASE must equal the explicit target database name.",
    );
  // Credentials, TLS and application options never make the same endpoint a different DB.
  if (endpoint(sourceUrl) === endpoint(targetUrl))
    throw new TransferRefusal("Source and target URLs identify the same database endpoint.");
  return {
    sourceUrl: sourceUrl.href,
    targetUrl: targetUrl.href,
    expectedDatabase,
    apply: args.length === 1,
  };
}

function parseUrl(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new TransferRefusal("Both database variables must contain explicit PostgreSQL URLs.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2
  )
    throw new TransferRefusal("Both database URLs must specify a host and database name.");
  // libpq connection overrides can silently change the endpoint or transaction settings.
  const allowed = new Set(["sslmode", "sslcert", "sslkey", "sslrootcert"]);
  if ([...url.searchParams.keys()].some((key) => !allowed.has(key)))
    throw new TransferRefusal("Unsupported database URL option. Only TLS options are allowed.");
  return url;
}

function endpoint(url: URL) {
  return `${url.hostname}:${url.port || "5432"}/${decodeURIComponent(url.pathname.slice(1))}`;
}

export function safeFailure(error: unknown): string {
  if (error instanceof TransferRefusal) return error.message;
  const code = (error as { code?: unknown } | null)?.code;
  const suffix = typeof code === "string" && /^[A-Z0-9_]{2,30}$/u.test(code) ? ` (${code})` : "";
  return `Transfer failed${suffix}. Uncommitted target work is rolled back. Check database logs without sharing credentials.`;
}
