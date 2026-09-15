/**
 * Pictogram of a classification d'être vivant (oiseau, faune non-oiseau, flore), from the Figma
 * « Icones fonctionnelles » page. Filenames in `./icons/classification/` are the classification
 * slugs.
 */

import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";

const iconUrls = import.meta.glob("./icons/classification/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const SLUGS: Record<ClassificationEtreVivant, string> = {
  oiseau: "oiseau",
  "faune non-oiseau": "faune-non-oiseau",
  flore: "flore",
};

export function classificationIconUrl(classification: ClassificationEtreVivant): string {
  return iconUrls[`./icons/classification/${SLUGS[classification]}.svg`];
}
