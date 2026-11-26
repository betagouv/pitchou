import { createHash, randomBytes } from "node:crypto";
import type { Knex } from "knex";
import type { ApiKeyInput, ApiKeySummary } from "@pitchou/types/externalApi.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { directDatabaseConnection } from "../connection.ts";

export type ApiKeyOwner =
  | { user_id: UserId; client_id?: never }
  | { client_id: string; user_id?: never };
export const apiKeyPattern = /^pitchou_[A-Za-z0-9_-]{43}$/u;
export const externalApiRequestsPerMinute = 60;

type KeyRow = {
  id: string;
  label: string;
  scopes: ApiKeySummary["scopes"];
  expires_at: Date;
  revoked_at: Date | null;
  last_used_at: Date | null;
  user_id: UserId | null;
  client_id: string | null;
};

const summaryColumns = [
  "id",
  "label",
  "scopes",
  "expires_at",
  "revoked_at",
  "last_used_at",
] as const;

function summarize(row: KeyRow): ApiKeySummary {
  return {
    id: row.id,
    label: row.label,
    scopes: row.scopes,
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
  };
}

export async function listApiKeys(owner: ApiKeyOwner, db: Knex = directDatabaseConnection) {
  const rows: KeyRow[] = await db("external_api_key")
    .where(owner)
    .select(summaryColumns)
    .orderBy("created_at", "desc");
  return rows.map(summarize);
}

export async function listServiceApiKeys(db: Knex) {
  const rows: KeyRow[] = await db("external_api_key")
    .whereNotNull("client_id")
    .select([...summaryColumns, "client_id"])
    .orderBy("created_at", "desc");
  return rows.map((row) => ({ ...summarize(row), clientId: row.client_id }));
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function createApiKey(owner: ApiKeyOwner, input: ApiKeyInput, db: Knex) {
  const secret = `pitchou_${randomBytes(32).toString("base64url")}`;
  const [row] = await db("external_api_key")
    .insert({
      ...owner,
      label: input.label,
      scopes: input.scopes,
      secret_hash: hashSecret(secret),
      expires_at: db.raw("now() + ? * interval '24 hours'", [input.days]),
    })
    .returning<KeyRow[]>(summaryColumns);
  return { key: summarize(row), secret };
}

export async function revokeApiKey(
  owner: ApiKeyOwner,
  keyId: string,
  db: Knex = directDatabaseConnection,
) {
  const [row] = await db("external_api_key")
    .where(owner)
    .where({ id: keyId })
    .whereNull("revoked_at")
    .update({ revoked_at: db.fn.now() })
    .returning<KeyRow[]>(summaryColumns);
  return row ? summarize(row) : null;
}

export function usableApiKeys(db: Knex) {
  return db("external_api_key")
    .whereNull("revoked_at")
    .where("expires_at", ">", db.raw("statement_timestamp()"))
    .where((owner) =>
      owner
        .whereNull("user_id")
        .orWhereExists(
          db("auth_user")
            .select("id")
            .where("id", db.ref("external_api_key.user_id"))
            .where({ active: true })
            .whereNotNull("email"),
        ),
    )
    .where((owner) =>
      owner
        .whereNull("client_id")
        .orWhereExists(
          db("external_api_client")
            .select("client_id")
            .where("client_id", db.ref("external_api_key.client_id"))
            .where({ enabled: true }),
        ),
    );
}

type AdmittedKey = Pick<KeyRow, "id" | "user_id" | "client_id" | "scopes">;

export async function admitApiKey(secret: string, db: Knex = directDatabaseConnection) {
  const key = usableApiKeys(db).where({ secret_hash: hashSecret(secret) });
  const window = "date_trunc('minute', statement_timestamp())";
  const [admitted] = await key
    .clone()
    .whereRaw(
      `(rate_window_start IS NULL OR rate_window_start < ${window} OR
      (rate_window_start = ${window} AND requests_this_minute < ?))`,
      [externalApiRequestsPerMinute],
    )
    .update({
      rate_window_start: db.raw(window),
      requests_this_minute: db.raw(
        `CASE WHEN rate_window_start = ${window} THEN requests_this_minute + 1 ELSE 1 END`,
      ),
      last_used_at: db.raw("greatest(last_used_at, statement_timestamp())"),
    })
    .returning<AdmittedKey[]>(["id", "user_id", "client_id", "scopes"])
    .timeout(3000, { cancel: true });
  if (admitted) return { admission: "admitted", key: admitted } as const;
  const usable = await key.first("id").timeout(3000, { cancel: true });
  return { admission: usable ? "limited" : "disabled" } as const;
}
