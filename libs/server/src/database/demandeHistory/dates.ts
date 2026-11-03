import {
  isCalendarDate,
  parseCalendarDate,
  withCalendarDateJSON,
} from "@pitchou/common/calendarDate.ts";
import type { DemandeState } from "./state.ts";

/** PostgreSQL's JSON date strings must agree with the live pg driver's Date values. */
export function restoreHistoryDates(state: DemandeState) {
  const rows = [
    state.dossier,
    ...state.phases,
    ...state.avis,
    ...state.decisions,
    ...state.prescriptions,
    ...state.controles,
    ...state.commentaires,
    ...state.attachments,
    ...state.files,
  ];
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value !== "string" || !/(?:_date|_at|timestamp)$/u.test(key)) continue;
      const date = isCalendarDate(value) ? parseCalendarDate(value) : new Date(value);
      if (Number.isFinite(date.getTime())) (row as unknown as Record<string, unknown>)[key] = date;
    }
  }
  state.dossier.ddep_depot_date = withCalendarDateJSON(state.dossier.ddep_depot_date);
}
