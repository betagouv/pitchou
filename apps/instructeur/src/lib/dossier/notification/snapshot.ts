import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import {
  applicantFieldLabels,
  type DossierNotification,
  type FieldChange,
} from "@pitchou/types/notification.ts";

export const dossierReviewContext = Symbol("dossier-review-snapshot");
const valuesBySnapshot = new WeakMap<DossierNotification, string>();

function applicantValues(dossier: DossierFull): string {
  const columns = new Set(dossier.notificationSnapshot?.changes.map(({ column }) => column));
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(dossier)
        .filter(
          ([key]) =>
            key in applicantFieldLabels ||
            columns.has(key) ||
            /^(deposant_|demandeur_|mandataire_|representative_)/.test(key) ||
            [
              "source",
              "activite_label",
              "especesImpactees",
              "piecesJointesPetitionnaires",
            ].includes(key),
        )
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

/** Register only an atomic detail response, never list metadata attached to cached values. */
export function registerReviewSnapshot(dossier: DossierFull): void {
  const snapshot = dossier.notificationSnapshot;
  if (!snapshot || snapshot.dossier !== dossier.id || dossier.access === "lecture") return;
  // The notification cannot be retargeted to different revisions by a local edit.
  for (const change of snapshot.changes) {
    Object.freeze(change.revisions);
    Object.freeze(change);
  }
  Object.freeze(snapshot.changes);
  Object.freeze(snapshot);
  valuesBySnapshot.set(snapshot, applicantValues(dossier));
}

export function boundReviewChanges(
  dossier: DossierFull,
  pending: Omit<DossierNotification, "dossier"> | undefined,
): FieldChange[] {
  const snapshot = dossier.notificationSnapshot;
  if (
    !snapshot ||
    snapshot.dossier !== dossier.id ||
    !pending ||
    dossier.access === "lecture" ||
    valuesBySnapshot.get(snapshot) !== applicantValues(dossier)
  )
    return [];
  const pendingIds = new Set(pending.changes.flatMap(({ revisions }) => revisions));
  return snapshot.changes.flatMap((change) => {
    const revisions = change.revisions.filter((id) => pendingIds.has(id));
    return revisions.length ? [{ ...change, revisions }] : [];
  });
}
