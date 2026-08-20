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
import { assertSpeciesSpreadsheet } from "@pitchou/common/especesUtils.ts";
import type { AdminDossierCreation } from "@pitchou/server/database/dossier_admin.ts";
import { readJsonObject } from "$lib/server/requestValidation";
import { speciesFileError } from "$lib/speciesFile.ts";
import { parseDossierCreation } from "$lib/server/dossierValidation";
import {
  loadActiviteContext,
  type ActiviteContext,
} from "$lib/server/dossierValidation/activiteContext.ts";

const uploadNames = [
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
type Uploads = Record<UploadName, File[]>;

function assertTotalSize(files: File[], message: string) {
  if (files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) error(400, message);
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

export async function parseDossierCreationUpload(request: Request) {
  let raw: Record<string, unknown>;
  let speciesFile: File | null = null;
  const uploads: Uploads = {
    purposeAttachments: [],
    previousAssessmentAttachments: [],
    mortalityMeasureAttachments: [],
    windFarmPlanAttachments: [],
    eolienProtocolAttachments: [],
    intervenantCvAttachments: [],
    completeDossierAttachments: [],
    noDerogationArgumentAttachments: [],
    supplementalAttachments: [],
  };
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const payload = form.get("payload");
    if (typeof payload !== "string") error(400, "Champ 'payload' manquant.");
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      raw = parsed as Record<string, unknown>;
    } catch {
      error(400, "Champ 'payload' invalide.");
    }
    const uploaded = form.get("speciesFile");
    if (uploaded instanceof File) speciesFile = uploaded;
    for (const name of uploadNames)
      uploads[name] = form
        .getAll(name)
        .filter((value): value is File => value instanceof File && value.size > 0);
    assertTotalSize(
      uploads.windFarmPlanAttachments,
      "La taille totale des plans des installations ne doit pas dépasser 65 Mo.",
    );
    assertTotalSize(
      uploads.eolienProtocolAttachments,
      "La taille totale des pièces du protocole ne doit pas dépasser 65 Mo.",
    );
    assertTotalSize(
      uploads.intervenantCvAttachments,
      "La taille totale des CV ne doit pas dépasser 65 Mo.",
    );
  } else raw = await readJsonObject(request);
  const activiteContext = await loadActiviteContext();
  const creation = parseDossierCreation(raw, activiteContext);
  validateAttachments(creation, uploads, activiteContext);
  const attachments = uploadNames.flatMap((name) => uploads[name]);
  assertTotalSize(
    [...attachments, ...(speciesFile ? [speciesFile] : [])],
    "La taille totale des fichiers ne doit pas dépasser 65 Mo.",
  );
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
  if (speciesFile) {
    const fileError = speciesFileError(speciesFile);
    if (fileError) error(400, fileError);
  }
  const arrayBuffer = speciesFile ? await speciesFile.arrayBuffer() : null;
  if (arrayBuffer) {
    try {
      await assertSpeciesSpreadsheet(arrayBuffer);
    } catch (caught) {
      error(400, caught instanceof Error ? caught.message : "Le tableur n'est pas valide.");
    }
  }
  return {
    creation,
    speciesFile,
    speciesContent: arrayBuffer ? Buffer.from(arrayBuffer) : null,
    attachments,
  };
}
