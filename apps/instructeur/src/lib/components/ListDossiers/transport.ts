import type {
  DossiersListOptions,
  DossiersListPage,
  DossiersListScope,
} from "@pitchou/types/dossierList.ts";
import { formatNotification } from "#lib/dossier/notification.ts";

async function request<T>(
  path: string,
  scope: DossiersListScope,
  query: string,
  signal: AbortSignal,
): Promise<T> {
  const params = new URLSearchParams(query);
  params.set("scope", scope);
  if (params.has("from") || params.has("to")) {
    params.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
  const response = await fetch(`/dossiers/${path}?${params}`, {
    signal,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function loadDossiersPage(
  scope: DossiersListScope,
  query: string,
  signal: AbortSignal,
) {
  const result = await request<DossiersListPage>("page", scope, query, signal);
  for (const dossier of result.items) {
    if (dossier.depot_date) dossier.depot_date = new Date(dossier.depot_date);
    if (dossier.phase_start_date) dossier.phase_start_date = new Date(dossier.phase_start_date);
    if (dossier.next_due_date) dossier.next_due_date = new Date(dossier.next_due_date);
  }
  result.notifications = result.notifications.map(formatNotification);
  return result;
}

export const loadDossiersOptions = (scope: DossiersListScope, signal: AbortSignal) =>
  request<DossiersListOptions>("options", scope, "", signal);
