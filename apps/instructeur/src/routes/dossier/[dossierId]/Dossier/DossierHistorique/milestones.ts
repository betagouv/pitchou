import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";

import type { HistoriqueEntry } from "./display.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

/** Dépôt label per provenance; unknown sources are legacy imports. */
const depotLabelBySource: Record<string, string> = {
  demarche_numerique: "Dossier déposé sur Démarches Numériques",
  pitchou: "Dossier créé dans Pitchou",
  gunenv: "Dossier importé depuis GunEnv",
  onagre: "Dossier importé depuis Onagre",
  import_fichier: "Dossier importé depuis un fichier du service",
  unknown: "Dossier importé dans Pitchou",
};

/** Milestones derived from the dossier itself rather than stored actions. */
export function milestoneEntries(dossier: DossierFull): HistoriqueEntry[] {
  const entries: HistoriqueEntry[] = [];
  if (dossier.depot_date) {
    const viaDN = dossier.source === "demarche_numerique";
    entries.push({
      id: "virtual-depot",
      icon: "fr-icon-file-text-line",
      tone: viaDN ? "petitionnaire" : "system",
      label: depotLabelBySource[dossier.source] ?? depotLabelBySource.unknown,
      date: new Date(dossier.depot_date),
      // Imported dossiers often only carry the day of their dépôt.
      timeKnown: isTimeOfDayKnown(dossier.depot_date),
      author: viaDN ? "par le pétitionnaire" : undefined,
    });
  }
  const now = new Date();
  const consultation: [Date | null, string, string][] = [
    [
      dossier.public_consultation_start_date,
      "virtual-consultation-start",
      "Début de la consultation du public",
    ],
    [
      dossier.public_consultation_end_date,
      "virtual-consultation-end",
      "Fin de la consultation du public",
    ],
  ];
  for (const [date, id, label] of consultation) {
    if (date && new Date(date) <= now) {
      entries.push({
        id,
        icon: "fr-icon-volume-up-line",
        tone: "system",
        label,
        date: new Date(date),
        // Entered as a day in the instruction form: it has no time of day.
        timeKnown: false,
      });
    }
  }
  return entries;
}
