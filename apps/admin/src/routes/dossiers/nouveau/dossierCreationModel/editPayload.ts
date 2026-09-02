// Builds the update payload when a pitchou-native dossier is edited through the intake form.

import type {
  AdminDossierDetail,
  AdminDossierRelationsPayload,
  AdminDossierUpdatePayload,
} from "$lib/actions/adminDossiers.ts";
import { mergeDossierRelationsForEdit } from "./relations.ts";
import { buildCreationPayload } from "./payload.ts";
import type { CompanyDetailsChoice, DossierCreationModel } from "./state.ts";
import { selectedDossierAttachmentFiles } from "./visibility.ts";

/**
 * Assembles the columns, relations (only when they changed) and files of the edit form.
 * Throws when the total attachment size exceeds the upload limit.
 */
export function buildNativeEditPayload(
  model: DossierCreationModel,
  detail: AdminDossierDetail,
  companyDetailsChoice: CompanyDetailsChoice,
  initialRelations: AdminDossierRelationsPayload,
): {
  payload: AdminDossierUpdatePayload;
  relations: AdminDossierRelationsPayload;
  attachments: File[];
} {
  const intake = buildCreationPayload(model);
  const attachments = selectedDossierAttachmentFiles(model);
  const allFiles = [...(model.speciesFile ? [model.speciesFile] : []), ...attachments];
  if (allFiles.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
    throw new Error("La taille totale des fichiers ne doit pas dépasser 65 Mo.");
  }
  const payload: AdminDossierUpdatePayload = {
    columns: {
      ...intake.columns,
      name: intake.name,
      depot_date: intake.depot_date,
    },
  };
  const relations = mergeDossierRelationsForEdit(intake.relations, detail, companyDetailsChoice);
  if (JSON.stringify(relations) !== JSON.stringify(initialRelations)) {
    payload.relations = relations;
  }
  return { payload, relations, attachments };
}
