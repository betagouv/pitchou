import type {
  DescriptionImpact,
  DescriptionMenacesEspeces,
  EspeceProtegee,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "@pitchou/types/especes.d.ts";

export function flattenImpactedEspeces(description: DescriptionMenacesEspeces) {
  const byReference = new Map<
    EspeceProtegee["CD_REF"],
    { espèce?: EspeceProtegee; impacts?: DescriptionImpact[] }
  >();
  for (const classification in description) {
    const especes: Array<OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte> =
      (description as any)[classification] ?? [];
    for (const espece of especes) {
      const entry = byReference.get(espece.espèce.CD_REF) ?? { espèce: espece.espèce, impacts: [] };
      entry.impacts?.push(espece);
      byReference.set(espece.espèce.CD_REF, entry);
    }
  }
  return [...byReference.values()];
}
