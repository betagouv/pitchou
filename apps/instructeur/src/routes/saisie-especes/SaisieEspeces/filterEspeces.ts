import { normalizeEspeceName, normalizeEspeceText } from "@pitchou/common/stringManipulation.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

export function filterEspecesByText(especes: EspeceProtegee[], text: string) {
  if (!text.trim()) return [];
  const parts = text.trim().split(" ").map(normalizeEspeceText).filter(Boolean);
  return especes
    .filter(({ nomsScientifiques, nomsVernaculaires }) =>
      parts.every((part) =>
        [...nomsScientifiques, ...nomsVernaculaires].some((name) =>
          normalizeEspeceName(name).includes(part),
        ),
      ),
    )
    .slice(0, 12);
}
