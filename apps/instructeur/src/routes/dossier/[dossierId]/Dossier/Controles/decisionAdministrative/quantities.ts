import { PrescriptionImportError, type SurfaceConversion } from "./errors.ts";

const columns = {
  compensated_surface: "Surface compensée",
  avoided_surface: "Surface évitée",
  compensated_individus: "Individus compensés",
  avoided_individus: "Individus évités",
  compensated_nids: "Nids compensés",
  avoided_nids: "Nids évités",
} as const;

type Quantity = keyof typeof columns;

function parseQuantity(value: unknown, surface: boolean): number | null {
  if (value == null || String(value).trim() === "") return null;
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 0 && value <= 2147483647) return value;
    throw new Error("Invalid quantity");
  }
  const match = String(value)
    .trim()
    .match(/^(\d+|\d{1,3}(?:[ \u00A0\u202F]\d{3})+)(?:[,.](\d+))?\s*(ha|m²|m2)?$/iu);
  if (!match || (!surface && match[3])) throw new Error("Invalid quantity");

  const scale = match[3]?.toLowerCase() === "ha" ? 4 : 0;
  const fraction = (match[2] ?? "").replace(/0+$/u, "");
  if (fraction.length > scale) throw new Error("Fractional quantity");
  // Shift decimal digits instead of multiplying floats, so 0,0003 ha is exactly 3 m².
  const amount = BigInt(match[1].replaceAll(/\s/gu, "") + fraction.padEnd(scale, "0"));
  if (amount > 2147483647n) throw new Error("Quantity exceeds database limit");
  return Number(amount);
}

export function parseQuantities(
  row: Record<string, unknown>,
  prescriptionNumber: number,
  conversions: SurfaceConversion[],
) {
  const quantities = {} as Record<Quantity, number | null>;
  for (const [key, column] of Object.entries(columns) as [Quantity, string][]) {
    const surface = key.endsWith("_surface");
    try {
      quantities[key] = parseQuantity(row[column], surface);
      if (surface && typeof row[column] === "string" && /ha\s*$/iu.test(row[column])) {
        conversions.push({
          prescription: prescriptionNumber,
          column,
          original: row[column],
          squareMetres: quantities[key]!,
        });
      }
    } catch {
      const hint = surface
        ? 'Indiquez une surface en m² entiers ou en hectares avec "ha", par exemple "24000" ou "2,4 ha".'
        : "Indiquez un nombre entier positif ou nul, sans unité.";
      throw new PrescriptionImportError(
        `Prescription ${prescriptionNumber}, colonne "${column}" : valeur "${String(row[column])}" invalide. ${hint} Maximum : 2147483647.`,
      );
    }
  }
  return quantities;
}
