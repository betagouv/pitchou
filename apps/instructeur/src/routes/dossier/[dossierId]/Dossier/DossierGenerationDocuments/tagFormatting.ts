import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function formatNumber(value: unknown, precision = 2): string | undefined {
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- Preserve numeric-prefix parsing and blank-input errors for existing document templates.
  if (typeof value === "string") value = parseFloat(value);
  if (typeof value !== "number") return undefined;
  if (Number.isNaN(value)) return "(erreur de calcul)";
  return Number.isInteger(value) ? value.toString(10) : value.toFixed(precision);
}

export function formatDocumentDate(date: any, formatString: string): string | undefined {
  if (!date) return undefined;
  return format(new Date(date), formatString, { locale: fr });
}

export function formatSimpleDocumentDate(date: any): string | undefined {
  return formatDocumentDate(date, "d MMMM yyyy");
}
