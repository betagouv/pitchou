import { createHash, randomBytes } from "node:crypto";

import type { Knex } from "knex";

import { directDatabaseConnection } from "./database.ts";

// Opaque session token carried in a cookie; the DB only ever stores its sha256
// hash, so a DB read-leak can't be replayed as a cookie. The session records
// authentication (who the user is); each app layers its own authorization on top.

export const SESSION_COOKIE_NAME = "pitchou_session";

// Sliding 7-day window, independent of the identity provider's own SSO session.
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// Renewing on every request would mean a DB write per request; throttle so a
// session slides at most about once per hour.
const RENEW_THROTTLE_SECONDS = 60 * 60;

type SessionRow = {
  id: string;
  email: string;
  name: string;
  id_token: string | null;
};

export type Session = { email: string; name: string; idToken: string | null };

/**
 * Cookie domain shared across sibling subdomains. Unset (host-only) for localhost
 * and staging; set to the parent domain (e.g. `.pitchou.…`) once the apps live on
 * sibling subdomains, so a session created in one is seen by the others.
 */
export function sessionCookieDomain(): string | undefined {
  return process.env.SESSION_COOKIE_DOMAIN || undefined;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiryFromNow(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

export async function createSession(
  { email, name, idToken }: { email: string; name: string; idToken: string | null },
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await databaseConnection("session").insert({
    id: hashToken(token),
    email,
    name,
    id_token: idToken,
    date_expired: expiryFromNow(),
  });
  return token;
}

export async function readSession(
  token: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Session | null> {
  const id = hashToken(token);
  const row = await databaseConnection<SessionRow>("session")
    .select("email", "name", "id_token")
    .where({ id })
    .andWhere("date_expired", ">", databaseConnection.fn.now())
    .first();

  if (!row) return null;

  // Slide the expiry, throttled: only write when the last renewal is over an hour old.
  const slideThreshold = new Date(
    Date.now() + (SESSION_TTL_SECONDS - RENEW_THROTTLE_SECONDS) * 1000,
  );
  await databaseConnection("session")
    .where({ id })
    .andWhere("date_expired", "<", slideThreshold)
    .update({ date_expired: expiryFromNow() });

  return { email: row.email, name: row.name, idToken: row.id_token };
}

/** Deletes the session and returns its stored id_token (for the logout id_token_hint). */
export async function deleteSession(
  token: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string | null> {
  const [row] = await databaseConnection<SessionRow>("session")
    .where({ id: hashToken(token) })
    .del()
    .returning("id_token");
  return row?.id_token ?? null;
}

export async function deleteExpiredSessions(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("session")
    .where("date_expired", "<", databaseConnection.fn.now())
    .del();
}
