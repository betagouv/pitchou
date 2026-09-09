const prefix = "especes:impact_type:";

export function speciesImpactChangeField(impactType: string | null): string {
  return `${prefix}${impactType ?? "unspecified"}`;
}

export function parseSpeciesImpactChangeField(field: string): string | null | undefined {
  if (!field.startsWith(prefix)) return undefined;
  const impactType = field.slice(prefix.length);
  if (!impactType) return undefined;
  return impactType === "unspecified" ? null : impactType;
}
