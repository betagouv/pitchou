import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import {
  buildDossierUpdateColumns,
  createDossierAdminColumnModel,
} from "./dossierAdminColumnModel.ts";
import {
  buildDossierRelations,
  createDossierAdminRelationsModel,
} from "./dossierAdminRelationsModel.ts";

export { buildDossierUpdateColumns, buildDossierRelations };
export type {
  Commune,
  FeatureCollection,
  ScientificIntervenant,
  TriState,
} from "./dossierAdminColumnModel.ts";
export type { DemandeurType, IdentityFormModel } from "./dossierAdminRelationsModel.ts";

export type DossierAdminFormModel = ReturnType<typeof createDossierAdminFormModel>;

export function createDossierAdminFormModel(detail: AdminDossierDetail) {
  return {
    ...createDossierAdminRelationsModel(detail),
    ...createDossierAdminColumnModel(detail.dossier),
  };
}
