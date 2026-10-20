import { expect, test } from "vitest";
import { formatNumber } from "./tagFormatting.ts";

test.each([
  [0, "0"],
  [12, "12"],
  [-12.345, "-12.35"],
  ["12", "12"],
  ["  12.345  ", "12.35"],
  ["+.5", "0.50"],
  ["1e2", "100"],
  ["-0", "0"],
])("formats numeric input %j", (value, expected) => {
  expect(formatNumber(value)).toBe(expected);
});

test("uses the requested precision for fractional numbers", () => {
  expect(formatNumber("12.3456", 3)).toBe("12.346");
  expect(formatNumber("12", 3)).toBe("12");
});

test.each([
  ["12px", "12"],
  ["12,5", "12"],
  ["12.345 hectares", "12.35"],
  ["1e", "1"],
  ["0x10", "0"],
  ["0b10", "0"],
])("preserves numeric-prefix parsing for existing templates: %j", (value, expected) => {
  expect(formatNumber(value)).toBe(expected);
});

test.each(["", "   ", "\t\n", "not a number", "NaN", NaN])(
  "reports invalid input %j without turning it into zero",
  (value) => {
    expect(formatNumber(value)).toBe("(erreur de calcul)");
  },
);

test.each([undefined, null, true, false, [], [12], {}].map((value) => ({ value })))(
  "does not coerce nonnumeric input $value",
  ({ value }) => {
    expect(formatNumber(value)).toBeUndefined();
  },
);
