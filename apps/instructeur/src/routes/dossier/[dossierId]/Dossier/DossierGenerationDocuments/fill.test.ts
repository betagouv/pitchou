import { expect, test } from "vitest";

import { generationTimestamp } from "./fill.ts";

test("the stamp is the local time of the generation, readable in a filename", () => {
  // 14h32 on the instructeur's clock, whatever the zone: built from local parts.
  const stamp = generationTimestamp(new Date(2026, 7, 19, 14, 32));

  expect(stamp).toBe("2026-08-19-14h32");
});

test("the stamp only uses characters every filesystem accepts", () => {
  const stamp = generationTimestamp(new Date(2026, 0, 2, 3, 4));

  // ':' is forbidden in Windows filenames, and browsers mangle it on download.
  expect(stamp).toMatch(/^[A-Za-z0-9._-]+$/);
  expect(stamp).toBe("2026-01-02-03h04");
});
