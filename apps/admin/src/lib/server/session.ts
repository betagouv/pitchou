import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Cookies } from "@sveltejs/kit";
import { dev } from "$app/environment";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieDomain,
} from "@pitchou/server/session.ts";

import { requireEnv } from "./env.ts";

const TX_COOKIE = "pitchou_admin_oauth_tx";
// Time allowed to complete the login round-trip (redirect to ProConnect and back).
const TX_MAX_AGE = 10 * 60;

export type OAuthTransaction = { state: string; nonce: string; redirectTo: string };

// --- Session cookie (opaque token; the session itself lives in the shared DB) ---

export function setSessionCookie(cookies: Cookies, token: string): void {
  cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/",
    domain: sessionCookieDomain(),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function readSessionToken(cookies: Cookies): string | undefined {
  return cookies.get(SESSION_COOKIE_NAME);
}

export function clearSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE_NAME, { path: "/", domain: sessionCookieDomain() });
}

// --- Login handshake (state / nonce carried across the redirect) ---
//
// App-local and short-lived, so it stays a signed cookie rather than a DB row.

function handshakeSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv("ADMIN_SESSION_SECRET"));
}

export async function setTransaction(cookies: Cookies, tx: OAuthTransaction): Promise<void> {
  const token = await new SignJWT({ ...tx })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TX_MAX_AGE}s`)
    .sign(handshakeSecret());
  cookies.set(TX_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    path: "/",
    maxAge: TX_MAX_AGE,
  });
}

export async function readTransaction(cookies: Cookies): Promise<OAuthTransaction | null> {
  const token = cookies.get(TX_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<JWTPayload & OAuthTransaction>(token, handshakeSecret());
    return { state: payload.state, nonce: payload.nonce, redirectTo: payload.redirectTo };
  } catch {
    return null;
  }
}

export function clearTransaction(cookies: Cookies): void {
  cookies.delete(TX_COOKIE, { path: "/" });
}
