import { actionDisplay, emailName, str, type ActionData } from "./actionLabels.ts";
import { milestoneEntries } from "./milestones.ts";
import { phaseEventTimestamp } from "../../phaseEventTimestamp.ts";
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
  statuses?: { icon: string; label: string; date: Date }[];
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

/** Stored actions, phase history, CNPN emails and derived milestones, most recent first. */
export function historiqueEntries(
  actions: DossierAction[],
  dossier: DossierFull,
): HistoriqueEntry[] {
  const phaseEntries = (dossier.evenementsPhase ?? []).map<HistoriqueEntry>((event) => {
    // Optimistic events still have milliseconds; PostgreSQL stores whole seconds.
    const timestamp = phaseEventTimestamp(event.timestamp);
    const action = actions.find(
      ({ type, data }) =>
        type === "phase_renseignee" &&
        data?.dossier === event.dossier &&
        data.value === event.phase &&
        new Date(str(data, "timestamp") ?? "").getTime() === timestamp.getTime(),
    );
    const authorName = emailName(event.demarche_numerique_agent_email);
    return {
      ...actionDisplay("phase_renseignee", { value: event.phase }),
      tone: authorName || event.caused_by_personne != null ? "instructeur" : "system",
      author: authorName ? `par ${authorName}` : undefined,
      ...(action ? entryFromAction(action) : {}),
      id: `phase-${event.dossier}-${event.phase}-${timestamp.toISOString()}`,
      date: new Date(event.timestamp),
      timeKnown: isTimeOfDayKnown(event.timestamp),
    };
  });
  const cnpnEmailEntries = (dossier.cnpnEmailSentEvents ?? []).map<HistoriqueEntry>((event) => {
    const attachmentCount = event.attachment_names.length;
    const authorName = emailName(event.sent_by_email);
    return {
      id: `cnpn-email-${event.id}`,
      icon: "fr-icon-mail-line",
      tone: "instructeur",
      label: "Mail de saisine du CNPN envoyé :",
      value: event.subject,
      valueSuffix: attachmentCount
        ? ` · ${attachmentCount} pièce${attachmentCount > 1 ? "s" : ""} jointe${attachmentCount > 1 ? "s" : ""}`
        : undefined,
      date: new Date(event.sent_at),
      timeKnown: true,
      author: authorName ? `par ${authorName}` : undefined,
      statuses: [
        ...(event.delivered_at
          ? [
              {
                icon: "fr-icon-checkbox-circle-line",
                label: "Distribué au destinataire",
                date: new Date(event.delivered_at),
              },
            ]
          : []),
        ...(event.opened_at
          ? [
              {
                icon: "fr-icon-eye-line",
                label: "Ouverture détectée",
                date: new Date(event.opened_at),
              },
            ]
          : []),
      ],
    };
  });

  return [
    ...actions.filter(({ type }) => type !== "phase_renseignee").map(entryFromAction),
    ...phaseEntries,
    ...cnpnEmailEntries,
    ...milestoneEntries(dossier),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}
