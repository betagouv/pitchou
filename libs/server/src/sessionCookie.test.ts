import { afterEach, expect, test, vi } from "vitest";
import { sessionCookieDomain, sessionCookieName } from "./session.ts";

afterEach(() => vi.unstubAllEnvs());

test("staging cookies cannot shadow production sessions on a shared domain", () => {
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "production");
  expect(sessionCookieName()).toBe("pitchou_session");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "staging");
  expect(sessionCookieName()).toBe("pitchou_staging_session");
  vi.stubEnv("PUBLIC_PITCHOU_ENV", "development");
  expect(sessionCookieName()).toBe("pitchou_session");
});

test.each([undefined, "", "   "])("an unset cookie domain stays host-only: %s", (domain) => {
  vi.stubEnv("SESSION_COOKIE_DOMAIN", domain);
  expect(sessionCookieDomain()).toBeUndefined();
});

test.each(["pitchou.incubateur.net", ".pitchou.incubateur.net", " pitchou.incubateur.net "])(
  "normalizes the configured domain: %s",
  (domain) => {
    vi.stubEnv("SESSION_COOKIE_DOMAIN", domain);
    expect(sessionCookieDomain()).toBe("pitchou.incubateur.net");
  },
);
