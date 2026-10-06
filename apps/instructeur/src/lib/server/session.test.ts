import type { Cookies } from "@sveltejs/kit";
import { afterEach, expect, test, vi } from "vitest";
import { clearSessionCookie, readSessionToken, setSessionCookie } from "./session.ts";

afterEach(() => vi.unstubAllEnvs());

test("staging ignores legacy cookies and sets and clears only its shared session", () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  vi.stubEnv("SESSION_COOKIE_DOMAIN", "pitchou.incubateur.net");
  const values = new Map([["pitchou_session", "legacy-or-production-session"]]);
  const set = vi.fn((name: string, value: string) => values.set(name, value));
  const remove = vi.fn((name: string) => values.delete(name));
  const cookies = {
    get: (name: string) => values.get(name),
    set,
    delete: remove,
  } as unknown as Cookies;

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
  expect(values.get("pitchou_session")).toBe("legacy-or-production-session");
});
