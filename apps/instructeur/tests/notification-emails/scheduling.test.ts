import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { deliveryTimeSql } from "@pitchou/server/dossierNotificationEmails/policy.ts";
import { expect, test } from "vitest";

test.each([
  ["2026-01-15T04:59:00Z", "2026-01-15T05:00:00Z"],
  ["2026-01-15T05:00:00Z", "2026-01-16T05:00:00Z"],
  ["2026-07-15T03:59:00Z", "2026-07-15T04:00:00Z"],
  ["2026-07-15T04:00:00Z", "2026-07-16T04:00:00Z"],
  ["2026-03-28T15:00:00Z", "2026-03-29T04:00:00Z"],
  ["2026-10-24T15:00:00Z", "2026-10-25T05:00:00Z"],
])("schedules %s for the next 06:00 in Paris", async (detected, expected) => {
  const result = await db.raw(
    `SELECT ${deliveryTimeSql("input.detected")} as due FROM (SELECT ?::timestamptz AS detected) input`,
    [detected],
  );
  expect(result.rows[0].due).toEqual(new Date(expected));
});
