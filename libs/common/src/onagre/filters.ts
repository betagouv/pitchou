export const filterOperators = [
  { value: "eq", label: "Est égal à" },
  { value: "neq", label: "Est différent de" },
  { value: "contains", label: "Contient" },
  { value: "not_contains", label: "Ne contient pas" },
  { value: "starts", label: "Commence par" },
  { value: "ends", label: "Se termine par" },
  { value: "gt", label: "Est supérieur à, nombre" },
  { value: "gte", label: "Est supérieur ou égal à, nombre" },
  { value: "lt", label: "Est inférieur à, nombre" },
  { value: "lte", label: "Est inférieur ou égal à, nombre" },
  { value: "before", label: "Est avant le, date" },
  { value: "after", label: "Est après le, date" },
  { value: "null", label: "Est absent, NULL" },
  { value: "not_null", label: "Est renseigné, non NULL" },
  { value: "empty", label: "Est une chaîne vide" },
  { value: "not_empty", label: "Contient une valeur" },
] as const;
export type FilterOperator = (typeof filterOperators)[number]["value"];
export type SourceFilter = { column: string; operator: FilterOperator; value: string };
export const maxFilters = 12;
export const numericPattern = "^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$";
export const needsFilterValue = (operator: FilterOperator) =>
  !["null", "not_null", "empty", "not_empty"].includes(operator);

export function filterError(filter: SourceFilter): string | null {
  if (
    ["gt", "gte", "lt", "lte"].includes(filter.operator) &&
    !new RegExp(numericPattern, "u").test(filter.value)
  )
    return "Saisissez un nombre, avec un point pour les décimales.";
  if (["before", "after"].includes(filter.operator)) {
    const date = new Date(`${filter.value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/u.test(filter.value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== filter.value
    )
      return "Saisissez une date valide au format AAAA-MM-JJ.";
  }
  return null;
}
