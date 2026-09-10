import { speciesDossier } from "./impactGroups.fixture.ts";
import type { DossierFull, GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import { registerReviewSnapshot } from "$lib/dossier/notification/snapshot.ts";
import { store } from "$lib/state/store.svelte.ts";

export const projectMap: GeoJSONFeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [2, 46],
            [2.1, 46],
            [2.1, 46.1],
            [2, 46],
          ],
        ],
      },
    },
  ],
};

export function fieldChange(field: string, column?: string): FieldChange {
  return {
    field,
    label: field,
    column,
    revisions: [`revision-${field}` as ActionDossierId],
    detected_at: new Date("2026-09-01T12:00:00Z"),
    modified_at: null,
  };
}

export function detailDossier(changes: FieldChange[], overrides: Partial<DossierFull> = {}) {
  const dossier = {
    ...speciesDossier(),
    projet_map: projectMap,
    ...overrides,
    notificationSnapshot: {
      dossier: speciesDossier().id,
      viewed: !changes.length,
      updated_at: new Date("2026-09-01T12:00:00Z"),
      viewed_at: null,
      changes,
      new_arrival: null,
      new_follow: null,
    },
  };
  store.notificationByDossier.set(dossier.id, dossier.notificationSnapshot);
  registerReviewSnapshot(dossier);
  return dossier;
}
