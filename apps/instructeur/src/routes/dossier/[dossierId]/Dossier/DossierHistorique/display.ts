import { actionDisplay, emailName, str, type ActionData } from "./actionLabels.ts";
import { milestoneEntries } from "./milestones.ts";
import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";

import type { DossierAction } from "@pitchou/types/capabilities.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export type HistoriqueEntry = {
  id: string;
  icon: string;
  /** Drives the bubble colour: purple, yellow or grey. */
  tone: "instructeur" | "petitionnaire" | "system";
  label: string;
  /** Non-bold context shown right before the bold value, e.g. « 20/08/2026 → ». */
  valuePrefix?: string;
  /** Bold detail appended after the label. */
  value?: string;
  /** Non-bold context shown right after the bold value, e.g. « → 29/08/2026 ». */
  valueSuffix?: string;
  date: Date;
  /**
   * Whether the time of day is meaningful. Recorded actions carry a real
   * timestamp; milestones read from a date-only field (the consultation du
   * public) would otherwise all claim to have happened at midnight.
   */
  timeKnown: boolean;
  /** "par claire.morin", "par le pétitionnaire", "à la demande de…" */
  author?: string;
};

function entryFromAction(action: DossierAction): HistoriqueEntry {
  const data = (action.data ?? {}) as ActionData;
  const requestedBy = emailName(str(data, "requested_by"));
  const authorName = emailName(action.author_email);
  return {
    id: action.id,
    tone: action.author_petitionnaire ? "petitionnaire" : authorName ? "instructeur" : "system",
    date: new Date(action.created_at),
    timeKnown: isTimeOfDayKnown(action.created_at),
    author: requestedBy
      ? `à la demande de ${requestedBy}`
      : action.author_petitionnaire
        ? "par le pétitionnaire"
        : authorName
          ? `par ${authorName}`
          : undefined,
    ...actionDisplay(action.type, data),
  };
}

/** Full historique, stored actions and derived milestones, most recent first. */
export function historiqueEntries(
  actions: DossierAction[],
  dossier: DossierFull,
): HistoriqueEntry[] {
  return [...actions.map(entryFromAction), ...milestoneEntries(dossier)].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}
