import { createHash, randomInt } from "node:crypto";

import type { Knex } from "knex";

import { directDatabaseConnection } from "./database.ts";

// Email login codes: a short numeric code is mailed to an address and entered on
// the login page to prove the person controls it. The DB only ever stores the
// code's sha256 hash, so a DB read-leak can't be replayed. This records a weak
// authentication signal (control of the inbox); each app layers its own
// authorization (e.g. an admin allow-list) on top.

// Short window: the code is single-use and attempt-limited, so 10 minutes is
// enough to receive the email and type it in.
export const CODE_TTL_SECONDS = 10 * 60;

// Burn the code after this many wrong tries, to bound brute-force of the 6-digit space.
export const MAX_ATTEMPTS = 5;

type LoginCodeRow = {
  email: string;
  code_hash: string;
  attempts: number;
};

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Cryptographically random 6-digit code, zero-padded (e.g. "004271"). */
function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function expiryFromNow(): Date {
  return new Date(Date.now() + CODE_TTL_SECONDS * 1000);
}

/**
 * Issues a fresh login code for the email and returns the plaintext code (to be
 * mailed). Any previous code for that address is overwritten, so the latest email
 * is the only one that works.
 */
export async function createLoginCode(
  email: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string> {
  const code = generateCode();
  await databaseConnection("login_code")
    .insert({
      email: normalizeEmail(email),
      code_hash: hashCode(code),
      attempts: 0,
      date_expired: expiryFromNow(),
    })
    .onConflict("email")
    .merge();
  return code;
}

/**
 * Checks a code against the live one for the email. The code is single-use:
 * a correct code is consumed, and a wrong one counts against the attempt budget
 * (the code is burned once exhausted). Returns true only on a match.
 */
export async function verifyLoginCode(
  email: string,
  code: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const row = await databaseConnection<LoginCodeRow>("login_code")
    .select("code_hash", "attempts")
    .where({ email: normalizedEmail })
    .andWhere("date_expired", ">", databaseConnection.fn.now())
    .first();

  if (!row) return false;

  // Too many tries already: burn the code rather than let it linger.
  if (row.attempts >= MAX_ATTEMPTS) {
    await databaseConnection("login_code").where({ email: normalizedEmail }).del();
    return false;
  }

  if (row.code_hash === hashCode(code)) {
    // Single-use: consume on success.
    await databaseConnection("login_code").where({ email: normalizedEmail }).del();
    return true;
  }

  // Wrong code: spend one attempt.
  await databaseConnection("login_code")
    .where({ email: normalizedEmail })
    .update({ attempts: row.attempts + 1 });
  return false;
}

export async function deleteExpiredLoginCodes(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("login_code")
    .where("date_expired", "<", databaseConnection.fn.now())
    .del();
}
