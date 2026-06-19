import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { isAdminEmail } from "./admin.ts";

// Tests never reference the real admin address: they drive the allow-list
// through the PITCHOU_ADMIN_EMAILS override with throwaway emails.
const TEST_ADMIN = "admin@pitchou.test";

describe("isAdminEmail", () => {
  const originalEnv = process.env.PITCHOU_ADMIN_EMAILS;

  beforeEach(() => {
    process.env.PITCHOU_ADMIN_EMAILS = `${TEST_ADMIN}, second-admin@pitchou.test`;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PITCHOU_ADMIN_EMAILS;
    } else {
      process.env.PITCHOU_ADMIN_EMAILS = originalEnv;
    }
  });

  it("accepts an address from the allow-list", () => {
    expect(isAdminEmail(TEST_ADMIN)).toBe(true);
    expect(isAdminEmail("second-admin@pitchou.test")).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isAdminEmail("  ADMIN@Pitchou.TEST ")).toBe(true);
  });

  it("rejects an address that is not in the allow-list", () => {
    expect(isAdminEmail("instructeur@departement.gouv.fr")).toBe(false);
  });

  it("rejects empty values", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("falls back to the built-in default when the override is unset", () => {
    delete process.env.PITCHOU_ADMIN_EMAILS;
    // The throwaway test admin is not part of the built-in default.
    expect(isAdminEmail(TEST_ADMIN)).toBe(false);
  });
});
