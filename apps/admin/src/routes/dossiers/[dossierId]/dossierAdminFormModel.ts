import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import {
  buildDossierUpdateColumns,
  createDossierAdminColumnModel,
} from "./dossierAdminFormModel/dossierAdminColumnModel.ts";
import {
  buildDossierRelations,
  createDossierAdminRelationsModel,
} from "./dossierAdminFormModel/dossierAdminRelationsModel.ts";

export { buildDossierUpdateColumns, buildDossierRelations };
export type {
  Commune,
  FeatureCollection,
  LocationScope,
  ProjectMapFeature,
  ScientificIntervenant,
  TriState,
} from "./dossierAdminFormModel/dossierAdminColumnModel.ts";
export type {
  DemandeurType,
  IdentityFormModel,
} from "./dossierAdminFormModel/dossierAdminRelationsModel.ts";

export type DossierAdminFormModel = ReturnType<typeof createDossierAdminFormModel>;

export function createDossierAdminFormModel(detail: AdminDossierDetail) {
  return {
    ...createDossierAdminRelationsModel(detail),
    ...createDossierAdminColumnModel(detail.dossier),
  };
}
