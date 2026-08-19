export function dateToInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function ddepCompositeValue(
  ddep: boolean | null | undefined,
  erSufficient: boolean | null | undefined,
) {
  if (ddep === true) return "oui" as const;
  if (ddep === false)
    return erSufficient ? ("non_er_mesures_sufficient" as const) : ("non_sans_objet" as const);
  return "a_determiner" as const;
}
