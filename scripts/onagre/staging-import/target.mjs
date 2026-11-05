import { connectDatabase } from "../local-import/connection.mjs";

export const target = {
  app: "pitchou-staging",
  host: "pitchou-sta-8605.postgresql.a.osc-secnum-fr1.scalingo-dbs.com",
  port: "31000",
  database: "pitchou_sta_8605",
  bucket: "pitchou-staging",
  endpoint: "https://oos.cloudgouv-eu-west-1.outscale.com",
};

export function assertStagingTarget(env) {
  const url = new URL(env.DATABASE_URL ?? "");
  if (
    env.PUBLIC_PITCHOU_ENV !== "staging" ||
    env.PITCHOU_APP !== "instructeur" ||
    env.ONAGRE_DEPLOYMENT_ROLE ||
    env.STAGING_RESET_DATA === "true" ||
    !env.STAGING_EMAIL_ALLOWLIST?.trim() ||
    url.hostname !== target.host ||
    url.port !== target.port ||
    url.pathname !== `/${target.database}` ||
    url.username !== target.database ||
    env.S3_BUCKET !== target.bucket ||
    new URL(env.AWS_ENDPOINT_URL_S3 ?? "").origin !== target.endpoint
  )
    throw new Error("Expected the pinned regular staging database, storage and email protection");
  return url;
}

export async function connect(env) {
  const url = assertStagingTarget(env);
  const tunnel = env.ONAGRE_STAGING_TUNNEL_PORT;
  if (tunnel && !/^\d{4,5}$/u.test(tunnel)) throw new Error("Invalid local SSH tunnel port");
  return connectDatabase(
    {
      host: tunnel ? "127.0.0.1" : url.hostname,
      port: Number(tunnel ?? url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: target.database,
      connectionTimeoutMillis: 5000,
      // Scalingo's private database certificate is reached over its network or an authenticated SSH tunnel.
      ssl: { rejectUnauthorized: false },
    },
    { db: target.database, username: target.database },
  );
}
