import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

function lignesIgnorees(anomalies: AnomalieFichierEspeces[]): number {
  return anomalies.filter(({ ligneIgnoree }) => ligneIgnoree !== false).length;
}

export function anomaliesTitle(anomalies: AnomalieFichierEspeces[]): string {
  const anomaliesFichier = anomalies.filter(({ ligne }) => ligne === undefined).length;

  if (anomaliesFichier === anomalies.length) {
    return "Le fichier des impacts sur les espèces n’a pas pu être lu";
  }
  if (anomaliesFichier >= 1) {
    return "Le fichier espèces impactées n’a pas pu être lu entièrement";
  }

  const lignes = lignesIgnorees(anomalies);

  if (lignes === 0) {
    return anomalies.length > 1
      ? `${anomalies.length} valeurs du fichier n’ont pas pu être lues`
      : "1 valeur du fichier n’a pas pu être lue";
  }

  return lignes > 1
    ? `${lignes} lignes du fichier n’ont pas pu être lues`
    : "1 ligne du fichier n’a pas pu être lue";
}

export function anomaliesHint(anomalies: AnomalieFichierEspeces[]): string {
  return lignesIgnorees(anomalies) >= 1 ? "non reprises ci-dessous." : "";
}
