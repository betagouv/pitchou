import type { Cookies } from "@sveltejs/kit";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  setTransaction,
  readTransaction,
  clearTransaction,
  setSessionCookie,
  readSessionToken,
  clearSessionCookie,
} from "./session.ts";

// Minimal in-memory Cookies stub: enough for set/get/delete round-trips.
function fakeCookies() {
  const store = new Map<string, string>();
  const cookies = {
    get: (name: string) => store.get(name),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  } as unknown as Cookies;
  return { cookies, store };
}

const tx = { state: "s".repeat(32), nonce: "n".repeat(32), redirectTo: "/dossiers" };

afterEach(() => vi.unstubAllEnvs());

it("staging ignores legacy cookies and sets and clears only its shared session", () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("SESSION_COOKIE_DOMAIN", "pitchou.incubateur.net");
  const { cookies, store } = fakeCookies();
  store.set("pitchou_session", "legacy-or-production-session");
  const set = vi.spyOn(cookies, "set");
  const remove = vi.spyOn(cookies, "delete");

  expect(readSessionToken(cookies)).toBeUndefined();
  setSessionCookie(cookies, "staging-session");
  expect(set).toHaveBeenCalledWith("pitchou_staging_session", "staging-session", {
    domain: "pitchou.incubateur.net",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: expect.any(Boolean),
    maxAge: 7 * 24 * 60 * 60,
  });
  expect(readSessionToken(cookies)).toBe("staging-session");
  clearSessionCookie(cookies);
  expect(remove).toHaveBeenCalledWith("pitchou_staging_session", {
    path: "/",
    domain: "pitchou.incubateur.net",
  });
  expect(readSessionToken(cookies)).toBeUndefined();
  expect(store.get("pitchou_session")).toBe("legacy-or-production-session");
});

describe("login handshake cookie", () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "test-handshake-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  });

  it("round-trips state, nonce and redirectTo", async () => {
    const { cookies } = fakeCookies();
    await setTransaction(cookies, tx);
    expect(await readTransaction(cookies)).toEqual(tx);
  });

  it("returns null when no handshake cookie is present", async () => {
    const { cookies } = fakeCookies();
    expect(await readTransaction(cookies)).toBeNull();
  });

  it("rejects a tampered cookie value", async () => {
    const { cookies, store } = fakeCookies();
    await setTransaction(cookies, tx);
    for (const [name, value] of store) store.set(name, value + "tampered");
    expect(await readTransaction(cookies)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const { cookies } = fakeCookies();
    await setTransaction(cookies, tx);
    process.env.ADMIN_SESSION_SECRET = "another-secret";
    expect(await readTransaction(cookies)).toBeNull();
  });

  it("clears the handshake cookie", async () => {
    const { cookies, store } = fakeCookies();
    await setTransaction(cookies, tx);
    clearTransaction(cookies);
    expect(store.size).toBe(0);
    expect(await readTransaction(cookies)).toBeNull();
  });
});
