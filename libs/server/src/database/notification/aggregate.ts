import type ActionDossier from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierNotification, FieldChange } from "@pitchou/types/notification.ts";
import { applicantFieldLabels } from "@pitchou/types/notification.ts";

export function aggregateNotification(
  dossier: DossierId,
  row:
    | {
        arrival_viewed: boolean;
        follow_revision: string | null;
        follow_at: Date | null;
        viewed_at: Date | null;
      }
    | undefined,
  arrival: Date | undefined,
  actions: ActionDossier[],
  latestDetectedAt: Date | null = null,
): DossierNotification {
  const byField = new Map<string, FieldChange>();
  for (const action of actions) {
    const data = action.data as {
      notification?: boolean;
      notification_field?: string;
      field?: string;
      label?: string;
      column?: string;
      modified_at?: string;
    };
    const field = data.notification_field ?? data.field;
    if (!action.author_petitionnaire || data.notification !== true || !field) continue;
    const detected = new Date(action.created_at);
    const current = byField.get(field);
    if (current) {
      current.revisions.push(action.id);
      if (detected <= current.detected_at) continue;
    }
    byField.set(field, {
      field,
      label: data.label ?? data.field ?? field,
      column:
        data.column ??
        Object.entries(applicantFieldLabels).find(([, label]) => label === data.field)?.[0],
      revisions: current?.revisions ?? [action.id],
      detected_at: detected,
      modified_at: data.modified_at ? new Date(data.modified_at) : null,
    });
  }
  const changes = [...byField.values()];
  const new_arrival = arrival && !row?.arrival_viewed ? { detected_at: arrival } : null;
  const new_follow =
    row?.follow_revision && row.follow_at
      ? { revision: row.follow_revision, detected_at: row.follow_at }
      : null;
  const dates = changes.map(({ detected_at }) => detected_at.getTime());
  if (latestDetectedAt) dates.push(new Date(latestDetectedAt).getTime());
  return {
    dossier,
    viewed: !new_arrival && !new_follow && changes.length === 0,
    updated_at: dates.length ? new Date(Math.max(...dates)) : null,
    viewed_at: row?.viewed_at ?? null,
    new_arrival,
    new_follow,
    changes,
  };
}
