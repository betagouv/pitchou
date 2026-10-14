import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";

test.each([
  ["2026-01-15T04:59:00Z", "2026-01-15T05:00:00Z"],
  ["2026-01-15T05:00:00Z", "2026-01-16T05:00:00Z"],
  ["2026-07-15T03:59:00Z", "2026-07-15T04:00:00Z"],
  ["2026-07-15T04:00:00Z", "2026-07-16T04:00:00Z"],
  ["2026-03-28T15:00:00Z", "2026-03-29T04:00:00Z"],
  ["2026-10-24T15:00:00Z", "2026-10-25T05:00:00Z"],
])("schedules %s for the next 06:00 in Paris", async (detected, expected) => {
  const result = await db.raw("SELECT next_pitchou_email_delivery(?::timestamptz) as due", [
    detected,
  ]);
  expect(result.rows[0].due).toEqual(new Date(expected));
});
