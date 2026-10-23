import { afterEach, expect, test, vi } from "vitest";
import { hasChangedValues } from "./changedValues.ts";

afterEach(() => vi.unstubAllEnvs());
test("compares submitted values and ignores undefined fields, ids and empty phase lists", () => {
  expect(
    hasChangedValues(
      { enjeu: true },
      { id: 1, enjeu: true, field: undefined, evenementsPhase: [] },
    ),
  ).toBe(false);
  expect(hasChangedValues({ enjeu: true }, { enjeu: false })).toBe(true);
  expect(hasChangedValues({ quantity: "1" }, { quantity: 1 })).toBe(false);
  expect(hasChangedValues({ date: null }, { date: null })).toBe(false);
});
test.each(["Europe/Paris", "UTC"])(
  "compares PostgreSQL calendar dates in %s without inventing a change",
  (timezone) => {
    vi.stubEnv("TZ", timezone);
    expect(
      hasChangedValues({ due_date: new Date(2026, 6, 15) }, { due_date: new Date("2026-07-15") }),
    ).toBe(false);
    expect(
      hasChangedValues({ due_date: new Date(2026, 6, 15) }, { due_date: new Date("2026-07-16") }),
    ).toBe(true);
  },
);
