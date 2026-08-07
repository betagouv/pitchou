import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { phases } from "@pitchou/common/phases.ts";
import {
  requiresCompleteDossierAttachment,
  requiresNoDerogationArgumentAttachment,
  requiresSpeciesFile,
} from "@pitchou/common/dossierFormOptions.ts";
import { assertSpeciesSpreadsheet } from "@pitchou/common/especesUtils.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import {
  deleteFichiersWithoutOtherReferences,
  storeNewFichier,
} from "@pitchou/server/database/fichier.ts";
import {
  listDossiersForAdmin,
  type ListAdminDossiersOptions,
} from "@pitchou/server/database/dossier_admin_list.ts";
import { readJsonObject } from "$lib/server/requestValidation";
import { speciesFileError, speciesFileMediaType } from "$lib/speciesFile.ts";
import { parseDossierCreation, throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";

import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

function parsePhaseFilter(value: string | null): DossierPhase | undefined {
  if (!value) return undefined;
  if (!phases.has(value as DossierPhase)) {
    error(400, `Phase inconnue : '${value}'.`);
  }
  return value as DossierPhase;
}

function parseSourceFilter(value: string | null): ListAdminDossiersOptions["source"] {
  if (!value) return undefined;
  if (value !== "pitchou" && value !== "dn") {
    error(400, `Source inconnue : '${value}' (attendu : 'pitchou' ou 'dn').`);
  }
  return value;
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ url }) => {
  const params = url.searchParams;

  const { dossiers, total } = await listDossiersForAdmin({
    page: Number(params.get("page")) || 1,
    pageSize: Number(params.get("pageSize")) || 50,
    search: params.get("search") ?? undefined,
    phase: parsePhaseFilter(params.get("phase")),
    source: parseSourceFilter(params.get("source")),
  });

  return json({ dossiers, total });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  let rawCreation: Record<string, unknown>;
  let speciesFile: File | null = null;
  let purposeAttachments: File[] = [];
  let previousAssessmentAttachments: File[] = [];
  let mortalityMeasureAttachments: File[] = [];
  let windFarmPlanAttachments: File[] = [];
  let eolienProtocolAttachments: File[] = [];
  let intervenantCvAttachments: File[] = [];
  let completeDossierAttachments: File[] = [];
  let noDerogationArgumentAttachments: File[] = [];
  let supplementalAttachments: File[] = [];
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const payload = form.get("payload");
    if (typeof payload !== "string") error(400, "Champ 'payload' manquant.");
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      rawCreation = parsed as Record<string, unknown>;
    } catch {
      error(400, "Champ 'payload' invalide.");
    }
    const uploaded = form.get("speciesFile");
    if (uploaded instanceof File) speciesFile = uploaded;
    const uploadedFiles = (name: string) =>
      form.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
    purposeAttachments = uploadedFiles("purposeAttachments");
    previousAssessmentAttachments = uploadedFiles("previousAssessmentAttachments");
    mortalityMeasureAttachments = uploadedFiles("mortalityMeasureAttachments");
    windFarmPlanAttachments = uploadedFiles("windFarmPlanAttachments");
    eolienProtocolAttachments = uploadedFiles("eolienProtocolAttachments");
    intervenantCvAttachments = uploadedFiles("intervenantCvAttachments");
    completeDossierAttachments = uploadedFiles("completeDossierAttachments");
    noDerogationArgumentAttachments = uploadedFiles("noDerogationArgumentAttachments");
    supplementalAttachments = uploadedFiles("supplementalAttachments");
    if (windFarmPlanAttachments.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      error(400, "La taille totale des plans des installations ne doit pas dépasser 65 Mo.");
    }
    if (
      eolienProtocolAttachments.reduce((total, file) => total + file.size, 0) >
      65 * 1024 * 1024
    ) {
      error(400, "La taille totale des pièces du protocole ne doit pas dépasser 65 Mo.");
    }
    if (intervenantCvAttachments.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      error(400, "La taille totale des CV ne doit pas dépasser 65 Mo.");
    }
  } else {
    rawCreation = await readJsonObject(request);
  }

  const creation = parseDossierCreation(rawCreation);
  const needsSpeciesFile = requiresSpeciesFile(
    creation.columns?.main_activite as string | null,
    creation.columns?.request_context as string | null,
  );
  const needsCompleteDossier = requiresCompleteDossierAttachment(
    creation.columns?.main_activite as string | null,
    creation.columns?.request_context as string | null,
    creation.columns?.motif_derogation as string | null,
  );
  const needsNoDerogationArgument = requiresNoDerogationArgumentAttachment(
    creation.columns?.request_context as string | null,
  );
  if (needsCompleteDossier && completeDossierAttachments.length === 0) {
    error(400, "Le dossier complet de demande de dérogation est requis.");
  }
  if (!needsCompleteDossier && completeDossierAttachments.length >= 1) {
    error(400, "Le dossier complet ne s'applique pas à cette demande.");
  }
  if (needsNoDerogationArgument && noDerogationArgumentAttachments.length === 0) {
    error(400, "L'argumentaire concluant à l'absence de nécessité de dérogation est requis.");
  }
  if (!needsNoDerogationArgument && noDerogationArgumentAttachments.length >= 1) {
    error(400, "L'argumentaire ne s'applique pas à cette demande.");
  }
  if (
    creation.columns?.scientifique_previous_assessment === true &&
    previousAssessmentAttachments.length === 0
  ) {
    error(400, "Le bilan des opérations antérieures est requis.");
  }
  if (
    creation.columns?.scientifique_previous_assessment !== true &&
    previousAssessmentAttachments.length >= 1
  ) {
    error(400, "Le bilan des opérations antérieures ne s'applique pas à cette demande.");
  }
  if (creation.columns?.scientifique_demande_purposes == null && purposeAttachments.length >= 1) {
    error(400, "Les pièces justifiant la finalité ne s'appliquent pas à cette demande.");
  }
  if (
    creation.columns?.scientifique_mortality_measures_taken !== true &&
    mortalityMeasureAttachments.length >= 1
  ) {
    error(400, "Les pièces décrivant les mesures ne s'appliquent pas à cette demande.");
  }
  const windMortality =
    creation.columns?.main_activite ===
    "Production énergie renouvelable - Éolien -  Suivi mortalité";
  if (!windMortality && windFarmPlanAttachments.length >= 1) {
    error(400, "Le plan des installations ne s'applique pas à cette demande.");
  }
  if (!windMortality && eolienProtocolAttachments.length >= 1) {
    error(400, "Les pièces décrivant le protocole ne s'appliquent pas à cette demande.");
  }
  if (creation.columns?.scientifique_intervenants == null && intervenantCvAttachments.length >= 1) {
    error(400, "Les CV des intervenants ne s'appliquent pas à cette demande.");
  }
  const attachments = [
    ...purposeAttachments,
    ...previousAssessmentAttachments,
    ...mortalityMeasureAttachments,
    ...windFarmPlanAttachments,
    ...eolienProtocolAttachments,
    ...intervenantCvAttachments,
    ...completeDossierAttachments,
    ...noDerogationArgumentAttachments,
    ...supplementalAttachments,
  ];
  const uploadSize = attachments.reduce((total, file) => total + file.size, speciesFile?.size ?? 0);
  if (uploadSize > 65 * 1024 * 1024) {
    error(400, "La taille totale des fichiers ne doit pas dépasser 65 Mo.");
  }
  if (needsSpeciesFile && !speciesFile) {
    error(400, "Le fichier des espèces concernées est requis.");
  }
  if (!needsSpeciesFile && speciesFile) {
    error(400, "Le fichier des espèces concernées ne s'applique pas à cette demande.");
  }
  if (speciesFile) {
    const fileError = speciesFileError(speciesFile);
    if (fileError) error(400, fileError);
  }
  const speciesArrayBuffer = speciesFile ? await speciesFile.arrayBuffer() : null;
  if (speciesArrayBuffer) {
    try {
      await assertSpeciesSpreadsheet(speciesArrayBuffer);
    } catch (validationError) {
      error(
        400,
        validationError instanceof Error ? validationError.message : "Le tableur n'est pas valide.",
      );
    }
  }
  const speciesContent = speciesArrayBuffer ? Buffer.from(speciesArrayBuffer) : null;

  let storedFileId: FileId | undefined;
  const storedAttachmentIds: FileId[] = [];
  try {
    if (speciesFile && speciesContent) {
      const stored = await storeNewFichier({
        name: speciesFile.name,
        media_type: speciesFileMediaType(speciesFile.name),
        content: speciesContent,
      });
      storedFileId = stored.id;
    }
    for (const attachment of attachments) {
      const stored = await storeNewFichier({
        name: attachment.name,
        media_type: attachment.type || null,
        content: Buffer.from(await attachment.arrayBuffer()),
      });
      if (!stored.id) throw new Error("Le fichier joint n'a pas pu être enregistré.");
      storedAttachmentIds.push(stored.id);
    }
    const { id } = await directDatabaseConnection.transaction(async (trx) => {
      const created = await createDossierFromAdmin(creation, locals.user!.email, trx);
      if (storedFileId) {
        await trx("dossier").where({ id: created.id }).update({ especes_impactees: storedFileId });
      }
      if (storedAttachmentIds.length >= 1) {
        await trx("edge_dossier__fichier_pieces_jointes_petitionnaire").insert(
          storedAttachmentIds.map((fichier) => ({ dossier: created.id, fichier })),
        );
      }
      return created;
    });
    return json({ id }, { status: 201 });
  } catch (err) {
    if (storedFileId || storedAttachmentIds.length >= 1) {
      await deleteFichiersWithoutOtherReferences([
        ...(storedFileId ? [storedFileId] : []),
        ...storedAttachmentIds,
      ]).catch(() => {});
    }
    throwHttpErrorForAdminDossier(err);
  }
};
