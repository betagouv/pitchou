import type { DossierAction } from "@pitchou/types/capabilities.ts";

export type NouvellesModifications = {
  /**
   * Latest modification date per champ label, as logged by the synchronization
   * (`champ_modifie` actions — the labels come from its tracked columns).
   */
  fieldDates: Map<string, Date>;
  especes: Date | null;
  piecesJointes: Date | null;
};

/**
 * Pétitionnaire modifications the instructeur has not read yet: every
 * pétitionnaire action strictly newer than their last read of the dossier
 * (all of them when the dossier was never read).
 */
export function nouvellesModifications(
  actions: DossierAction[],
  lastReadAt: Date | null,
): NouvellesModifications {
  const fieldDates = new Map<string, Date>();
  let especes: Date | null = null;
  let piecesJointes: Date | null = null;
  for (const action of actions) {
    if (!action.author_petitionnaire) continue;
    const date = new Date(action.created_at);
    if (lastReadAt && date <= lastReadAt) continue;
    if (action.type === "champ_modifie") {
      const field = (action.data as Record<string, unknown>)?.field;
      if (typeof field !== "string" || !field) continue;
      const current = fieldDates.get(field);
      if (!current || date > current) fieldDates.set(field, date);
    } else if (action.type === "especes_renseignees") {
      if (!especes || date > especes) especes = date;
    } else if (action.type === "piece_jointe_importee") {
      if (!piecesJointes || date > piecesJointes) piecesJointes = date;
    }
  }
  return { fieldDates, especes, piecesJointes };
}
