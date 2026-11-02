import { expect, test } from "vitest";
import { resolveAppOrigin } from "./requestOrigin.ts";

test("each app selects its own origin before the shared deployment fallback", () => {
  const environment = {
    ORIGIN: "https://legacy.example.test",
    ORIGIN_INSTRUCTEUR: "https://pitchou.example.test/",
    ORIGIN_ADMIN: "https://admin.example.test",
  };
  expect(resolveAppOrigin("instructeur", environment)).toBe("https://pitchou.example.test");
  expect(resolveAppOrigin("admin", environment)).toBe("https://admin.example.test");
});

test.each(["admin", "instructeur"] as const)(
  "%s retains shared and absent origin behavior",
  (app) => {
    expect(resolveAppOrigin(app, { ORIGIN: "https://public.example.test" })).toBe(
      "https://public.example.test",
    );
    expect(resolveAppOrigin(app, { ORIGIN: "" })).toBeUndefined();
    expect(resolveAppOrigin(app, {})).toBeUndefined();
  },
);

test("an empty per-app override falls back to ORIGIN", () => {
  expect(resolveAppOrigin("admin", { ORIGIN_ADMIN: "", ORIGIN: "http://localhost:5174" })).toBe(
    "http://localhost:5174",
  );
});

test.each([
  "null",
  "example.test",
  "file:///tmp",
  "ftp://example.test",
  "https://user:password@example.test",
  "https://example.test/path",
  "https://example.test?query=yes",
  "https://example.test#hash",
])("rejects invalid origin configuration %s", (origin) => {
  expect(() => resolveAppOrigin("admin", { ORIGIN_ADMIN: origin })).toThrow();
});
