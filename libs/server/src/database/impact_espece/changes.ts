import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";

type ImpactValues = Pick<
  ImpactEspece,
  | "cd_ref"
  | "classification"
  | "impact_type"
  | "impact_methode"
  | "impact_moyen_de_poursuite"
  | "nombre_individus"
  | "nids"
  | "oeufs"
  | "surface_habitat_detruit"
>;

export function changedImpactTypes(
  before: ImpactValues[],
  after: ImpactValues[],
): (string | null)[] {
  const snapshots = [before, after].map((rows) => {
    const groups = new Map<string | null, string[]>();
    for (const row of rows) {
      const key = row.impact_type ?? null;
      const values = groups.get(key) ?? [];
      values.push(
        JSON.stringify([
          row.cd_ref,
          row.classification,
          row.impact_methode ?? null,
          row.impact_moyen_de_poursuite ?? null,
          row.nombre_individus ?? null,
          row.nids ?? null,
          row.oeufs ?? null,
          row.surface_habitat_detruit ?? null,
        ]),
      );
      groups.set(key, values);
    }
    // Keep duplicates: removing one of two identical impact rows is still a change.
    return new Map([...groups].map(([key, values]) => [key, JSON.stringify(values.sort())]));
  });
  const [previous, current] = snapshots;
  return [...new Set([...previous.keys(), ...current.keys()])].filter(
    (key) => previous.get(key) !== current.get(key),
  );
}
