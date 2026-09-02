import { actionDisplay, emailName, str, type ActionData } from "./actionLabels.ts";
import { milestoneEntries } from "./milestones.ts";
import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";

import type { DossierAction } from "@pitchou/types/capabilities.ts";
import type { DossierCnpnEmailSentEvent, DossierFull } from "@pitchou/types/API_Pitchou.ts";

export type HistoriqueStatus = {
  icon: string;
  label: string;
  date: Date;
};

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
  description?: string;
  statuses?: HistoriqueStatus[];
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

function entryFromCnpnEmail(event: DossierCnpnEmailSentEvent): HistoriqueEntry {
  const attachmentCount = event.attachment_names.length;
  const statuses: HistoriqueStatus[] = [];
  if (event.delivered_at) {
    statuses.push({
      icon: "fr-icon-checkbox-circle-line",
      label: "Distribué au destinataire",
      date: new Date(event.delivered_at),
    });
  }
  if (event.opened_at) {
    statuses.push({
      icon: "fr-icon-eye-line",
      label: "Ouverture détectée",
      date: new Date(event.opened_at),
    });
  }
  return {
    id: `cnpn-email-${event.id}`,
    icon: "fr-icon-mail-line",
    tone: event.sent_by_email ? "instructeur" : "system",
    label: "Mail de saisine du CNPN envoyé",
    date: new Date(event.sent_at),
    timeKnown: isTimeOfDayKnown(event.sent_at),
    author: event.sent_by_email ? `par ${emailName(event.sent_by_email)}` : undefined,
    description: `${event.subject}${
      attachmentCount
        ? ` · ${attachmentCount} pièce${attachmentCount > 1 ? "s" : ""} jointe${attachmentCount > 1 ? "s" : ""}`
        : ""
    }`,
    statuses,
  };
}

/** Full historique, stored actions and derived milestones, most recent first. */
export function historiqueEntries(
  actions: DossierAction[],
  dossier: DossierFull,
): HistoriqueEntry[] {
  return [
    ...actions.map(entryFromAction),
    ...(dossier.cnpnEmailSentEvents ?? []).map(entryFromCnpnEmail),
    ...milestoneEntries(dossier),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}
