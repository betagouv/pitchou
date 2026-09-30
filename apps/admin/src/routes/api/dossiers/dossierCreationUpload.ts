import { error } from "@sveltejs/kit";
import {
  activiteCodeForLabel,
  EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE,
} from "@pitchou/common/activiteCodes.ts";
import {
  requiresCompleteDossierAttachment,
  requiresNoDerogationArgumentAttachment,
  requiresSpeciesFile,
} from "@pitchou/common/dossierFormOptions.ts";
import type { AdminDossierCreation } from "@pitchou/server/database/dossier_admin.ts";
import type { AdminFileUpload } from "@pitchou/server/database/dossier_admin_files.ts";
import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { parseDossierCreation } from "$lib/server/dossierValidation";
import {
  loadActiviteContext,
  type ActiviteContext,
} from "$lib/server/dossierValidation/activiteContext.ts";
import { validateSpeciesUpload } from "$lib/server/speciesUpload";
import { parseUploadedFichier, parseUploadedFichiers } from "$lib/server/uploadedFichier";

export const uploadNames = [
  "purposeAttachments",
  "previousAssessmentAttachments",
  "mortalityMeasureAttachments",
  "windFarmPlanAttachments",
  "eolienProtocolAttachments",
  "intervenantCvAttachments",
  "completeDossierAttachments",
  "noDerogationArgumentAttachments",
  "supplementalAttachments",
] as const;
type UploadName = (typeof uploadNames)[number];
type Uploads = Record<UploadName, UploadedFichier[]>;

/** The `uploads` property of the body: references to files the browser sent to storage. */
function parseUploads(value: unknown): { speciesFile?: UploadedFichier; uploads: Uploads } {
  const uploads = Object.fromEntries(
    uploadNames.map((name) => [name, [] as UploadedFichier[]]),
  ) as Uploads;
  if (value === undefined || value === null) return { uploads };
  if (typeof value !== "object" || Array.isArray(value)) {
    error(400, "La propriété 'uploads' doit être un objet.");
  }
  const record = value as Record<string, unknown>;
  rejectUnknownProperties(record, new Set(["speciesFile", ...uploadNames]));
  for (const name of uploadNames) {
    uploads[name] = parseUploadedFichiers(record[name], `uploads.${name}`);
  }
  return { speciesFile: parseUploadedFichier(record.speciesFile, "uploads.speciesFile"), uploads };
}

function validateAttachments(
  creation: AdminDossierCreation,
  uploads: Uploads,
  activiteContext: ActiviteContext,
) {
  const columns = creation.columns;
  const activiteCode = activiteCodeForLabel(
    columns?.main_activite as string | null,
    activiteContext.codeByLabel,
  );
  const completeRequired = requiresCompleteDossierAttachment(
    activiteCode,
    columns?.request_context as string | null,
    columns?.motif_derogation as string | null,
  );
  const argumentRequired = requiresNoDerogationArgumentAttachment(
    columns?.request_context as string | null,
  );
  if (completeRequired !== uploads.completeDossierAttachments.length > 0) {
    error(
      400,
      completeRequired
        ? "Le dossier complet de demande de dérogation est requis."
        : "Le dossier complet ne s'applique pas à cette demande.",
    );
  }
  if (argumentRequired !== uploads.noDerogationArgumentAttachments.length > 0) {
    error(
      400,
      argumentRequired
        ? "L'argumentaire concluant à l'absence de nécessité de dérogation est requis."
        : "L'argumentaire ne s'applique pas à cette demande.",
    );
  }
  if (
    (columns?.scientifique_previous_assessment === true) !==
    uploads.previousAssessmentAttachments.length > 0
  ) {
    error(
      400,
      columns?.scientifique_previous_assessment === true
        ? "Le bilan des opérations antérieures est requis."
        : "Le bilan des opérations antérieures ne s'applique pas à cette demande.",
    );
  }
  if (columns?.scientifique_demande_purposes == null && uploads.purposeAttachments.length)
    error(400, "Les pièces justifiant la finalité ne s'appliquent pas à cette demande.");
  if (
    columns?.scientifique_mortality_measures_taken !== true &&
    uploads.mortalityMeasureAttachments.length
  )
    error(400, "Les pièces décrivant les mesures ne s'appliquent pas à cette demande.");
  const wind = activiteCode === EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE;
  if (!wind && uploads.windFarmPlanAttachments.length)
    error(400, "Le plan des installations ne s'applique pas à cette demande.");
  if (!wind && uploads.eolienProtocolAttachments.length)
    error(400, "Les pièces décrivant le protocole ne s'appliquent pas à cette demande.");
  if (columns?.scientifique_intervenants == null && uploads.intervenantCvAttachments.length)
    error(400, "Les CV des intervenants ne s'appliquent pas à cette demande.");
}

/**
 * Reads a dossier creation: the dossier fields plus, under `uploads`, the
 * files the browser already sent to storage. The species spreadsheet is
 * checked against storage before anything gets registered.
 */
export async function parseDossierCreationUpload(request: Request): Promise<{
  creation: AdminDossierCreation;
  species: AdminFileUpload | null;
  attachments: UploadedFichier[];
}> {
  const { uploads: rawUploads, ...raw } = await readJsonObject(request);
  const { speciesFile, uploads } = parseUploads(rawUploads);
  const activiteContext = await loadActiviteContext();
  const creation = parseDossierCreation(raw, activiteContext);
  validateAttachments(creation, uploads, activiteContext);
  const attachments = uploadNames.flatMap((name) => uploads[name]);
  const speciesRequired = requiresSpeciesFile(
    activiteCodeForLabel(
      creation.columns?.main_activite as string | null,
      activiteContext.codeByLabel,
    ),
    creation.columns?.request_context as string | null,
  );
  if (speciesRequired !== !!speciesFile)
    error(
      400,
      speciesRequired
        ? "Le fichier des espèces concernées est requis."
        : "Le fichier des espèces concernées ne s'applique pas à cette demande.",
    );
  const species = speciesFile ? await validateSpeciesUpload(speciesFile) : null;
  return { creation, species, attachments };
}
