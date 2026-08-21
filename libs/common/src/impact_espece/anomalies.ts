import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

export function anomaliesTitle(anomalies: AnomalieFichierEspeces[]): string {
  const lignes = anomalies.filter(({ ligne }) => ligne !== undefined).length;

  if (lignes === 0) return "Le fichier espèces impactées n’a pas pu être lu";
  if (lignes < anomalies.length) {
    return "Le fichier espèces impactées n’a pas pu être lu entièrement";
  }

  return lignes > 1
    ? `${lignes} lignes du fichier n’ont pas pu être lues`
    : "1 ligne du fichier n’a pas pu être lue";
}
