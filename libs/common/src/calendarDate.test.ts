import { expect, test } from "vitest";
import {
  calendarDateLabel,
  isCalendarDate,
  parseCalendarDate,
  withCalendarDateJSON,
} from "./calendarDate.ts";

test("calendar days survive JSON without becoming a UTC timestamp", () => {
  const date = withCalendarDateJSON(parseCalendarDate("2026-07-15"));
  expect(JSON.stringify({ date })).toBe('{"date":"2026-07-15"}');
  expect(calendarDateLabel(date!)).toBe("2026-07-15");
  expect(withCalendarDateJSON(null)).toBeNull();
});

test.each(["2024-02-29", "2026-07-15", "1999-12-31"])(
  "accepts the valid calendar day %s",
  (day) => {
    expect(isCalendarDate(day)).toBe(true);
  },
);

test.each([
  null,
  undefined,
  "2025-02-29",
  "2026-02-30",
  "2026-00-01",
  "15/07/2026",
  "2026-07-15T00:00:00Z",
])("rejects %s", (day) => {
  expect(isCalendarDate(day)).toBe(false);
});
