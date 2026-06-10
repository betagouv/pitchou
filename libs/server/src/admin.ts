/**
 * Admin gating for Pitchou. The admin allow-list is a small set of email
 * addresses. It defaults to a single address but can be overridden with the
 * `PITCHOU_ADMIN_EMAILS` environment variable (comma-separated).
 *
 * This module is database-free on purpose so it can be unit-tested and reused
 * both server-side (route guards) and when building a personne's identity.
 */

const DEFAULT_ADMIN_EMAILS = ["nicolas.cura.ext@beta.gouv.fr"];

/** The current admin allow-list, lowercased. Read lazily so env overrides apply. */
function adminEmails(): Set<string> {
  const raw = process.env.PITCHOU_ADMIN_EMAILS;
  const list = raw ? raw.split(",") : DEFAULT_ADMIN_EMAILS;
  return new Set(list.map((email) => email.trim().toLowerCase()).filter(Boolean));
}

/** True if the email belongs to an admin (case-insensitive). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}
