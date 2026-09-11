import { describe, expect, test } from "vitest";

import { isTimeOfDayKnown } from "./formatDate.ts";

describe("isTimeOfDayKnown", () => {
  test("an old event landing exactly on midnight has no known time", () => {
    // What the migration produced from the former day-only column.
    expect(isTimeOfDayKnown(new Date("2026-05-18T00:00:00Z"))).toBe(false);
  });

  test("an old event with a real time keeps it", () => {
    // Recorded between the migration and the deployment, in dev or staging.
    expect(isTimeOfDayKnown(new Date("2026-08-16T09:11:00Z"))).toBe(true);
  });

  test("after the deployment, midnight is a real time", () => {
    expect(isTimeOfDayKnown(new Date("2026-09-02T00:00:00Z"))).toBe(true);
  });

  test("accepts a serialized date and rejects what is not one", () => {
    expect(isTimeOfDayKnown("2026-08-16T09:11:00Z")).toBe(true);
    expect(isTimeOfDayKnown(null)).toBe(false);
    expect(isTimeOfDayKnown("pas une date")).toBe(false);
  });
});
