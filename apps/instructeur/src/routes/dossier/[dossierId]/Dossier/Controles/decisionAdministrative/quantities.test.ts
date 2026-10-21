import { expect, test } from "vitest";
import { parseQuantities } from "./quantities.ts";
import type { SurfaceConversion } from "./errors.ts";

test.each([
  ["2,4 ha", 24000],
  ["0,0003 ha", 3],
  ["2.4 HA", 24000],
  ["0 ha", 0],
])("proposes %s as %s square metres", (value, expected) => {
  const conversions: SurfaceConversion[] = [];
  expect(parseQuantities({ "Surface compensée": value }, 2, conversions).compensated_surface).toBe(
    expected,
  );
  expect(conversions).toEqual([
    { prescription: 2, column: "Surface compensée", original: value, squareMetres: expected },
  ]);
});

test.each([0, "0", "24000", "24 000", "24\u202F000 m²", "24000 m2"])(
  "accepts square metres %s without proposing a unit conversion",
  (value) => {
    const conversions: SurfaceConversion[] = [];
    const result = parseQuantities({ "Surface compensée": value }, 1, conversions);
    expect(result.compensated_surface).toBe(value === 0 || value === "0" ? 0 : 24000);
    expect(result.avoided_surface).toBeNull();
    expect(conversions).toEqual([]);
  },
);

test.each(["2,4", "2 4 ha", "0,00001 ha", "unknown", -1, 2147483648, "Infinity"])(
  "rejects invalid surfaces %s without rounding or guessing",
  (value) => {
    expect(() => parseQuantities({ "Surface compensée": value }, 3, [])).toThrow(
      'Prescription 3, colonne "Surface compensée"',
    );
  },
);

test.each(["2 ha", "2 individus", "2,4", -1])("rejects invalid counts %s", (value) => {
  expect(() => parseQuantities({ "Individus évités": value }, 1, [])).toThrow(
    'colonne "Individus évités"',
  );
});
