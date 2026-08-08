import type { AdminDossierDetail } from "$lib/actions/adminDossiers.ts";

import {
  buildDossierUpdateColumns,
  createDossierAdminColumnModel,
} from "./dossierAdminFormModel/columnModel.ts";
import {
  buildDossierRelations,
  createDossierAdminRelationsModel,
} from "./dossierAdminFormModel/relationsModel.ts";

export { buildDossierUpdateColumns, buildDossierRelations };
export type {
  Commune,
  FeatureCollection,
  LocationScope,
  ProjectMapFeature,
  ScientificIntervenant,
  TriState,
} from "./dossierAdminFormModel/columnModel.ts";
export type { DemandeurType, IdentityFormModel } from "./dossierAdminFormModel/relationsModel.ts";

export type DossierAdminFormModel = ReturnType<typeof createDossierAdminFormModel>;

export function createDossierAdminFormModel(detail: AdminDossierDetail) {
  return {
    ...createDossierAdminRelationsModel(detail),
    ...createDossierAdminColumnModel(detail.dossier),
  };
}
