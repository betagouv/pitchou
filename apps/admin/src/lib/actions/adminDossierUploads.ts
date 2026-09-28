import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";

/** Files picked in the creation form, per field. */
export type DossierCreationAttachments = {
  purpose: File[];
  previousAssessment: File[];
  mortalityMeasures: File[];
  windFarmPlan: File[];
  eolienProtocol: File[];
  intervenantCv: File[];
  completeDossier: File[];
  noDerogationArgument: File[];
  supplemental: File[];
};

export function emptyDossierCreationAttachments(): DossierCreationAttachments {
  return {
    purpose: [],
    previousAssessment: [],
    mortalityMeasures: [],
    windFarmPlan: [],
    eolienProtocol: [],
    intervenantCv: [],
    completeDossier: [],
    noDerogationArgument: [],
    supplemental: [],
  };
}

/** Field name → property of the `uploads` object the API expects. */
const UPLOAD_NAMES: Record<keyof DossierCreationAttachments, string> = {
  purpose: "purposeAttachments",
  previousAssessment: "previousAssessmentAttachments",
  mortalityMeasures: "mortalityMeasureAttachments",
  windFarmPlan: "windFarmPlanAttachments",
  eolienProtocol: "eolienProtocolAttachments",
  intervenantCv: "intervenantCvAttachments",
  completeDossier: "completeDossierAttachments",
  noDerogationArgument: "noDerogationArgumentAttachments",
  supplemental: "supplementalAttachments",
};

export type DossierCreationUploads = {
  speciesFile?: UploadedFichier;
  [attachments: string]: UploadedFichier | UploadedFichier[] | undefined;
};

/**
 * Sends every picked file to storage in one go and returns the `uploads`
 * object for the creation request, or undefined when there is nothing to send.
 */
export async function uploadDossierCreationFiles(
  speciesFile: File | null | undefined,
  attachments: DossierCreationAttachments,
): Promise<DossierCreationUploads | undefined> {
  const fields = Object.keys(UPLOAD_NAMES) as (keyof DossierCreationAttachments)[];
  const files = [
    ...(speciesFile ? [speciesFile] : []),
    ...fields.flatMap((field) => attachments[field]),
  ];
  if (files.length === 0) return undefined;

  const uploaded = await uploadFichiers(files);
  const uploads: DossierCreationUploads = {};
  if (speciesFile) uploads.speciesFile = uploaded.shift();
  for (const field of fields) {
    const count = attachments[field].length;
    if (count > 0) uploads[UPLOAD_NAMES[field]] = uploaded.splice(0, count);
  }
  return uploads;
}

export type DossierUpdateUploads = {
  speciesFile?: UploadedFichier;
  attachments?: UploadedFichier[];
};

/** Same as uploadDossierCreationFiles for the edit form, which has a single attachment list. */
export async function uploadDossierUpdateFiles(
  speciesFile: File | null,
  attachments: File[],
): Promise<DossierUpdateUploads | undefined> {
  const files = [...(speciesFile ? [speciesFile] : []), ...attachments];
  if (files.length === 0) return undefined;

  const uploaded = await uploadFichiers(files);
  const uploads: DossierUpdateUploads = {};
  if (speciesFile) uploads.speciesFile = uploaded.shift();
  if (attachments.length > 0) uploads.attachments = uploaded;
  return uploads;
}
