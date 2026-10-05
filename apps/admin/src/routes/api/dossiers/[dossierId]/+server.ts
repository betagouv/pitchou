import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import {
  DossierNotCreatedInPitchouError,
  deleteDossierFromAdmin,
  getDossierSyncStatus,
  updateDossierFromAdmin,
  updateDossierFromAdminInTransaction,
} from "@pitchou/server/database/dossier_admin.ts";
import { deleteFichiersWithoutOtherReferences } from "@pitchou/server/database/fichier.ts";
import { registerUploadedFichier } from "@pitchou/server/database/fichier_upload.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import { UploadedFichierError } from "@pitchou/server/upload.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  parseDossierId,
  parseDossierUpdate,
  throwHttpErrorForAdminDossier,
} from "$lib/server/dossierValidation";
import { loadActiviteContext } from "$lib/server/dossierValidation/activiteContext.ts";
import { validateSpeciesUpload } from "$lib/server/speciesUpload";
import {
  parseUploadedFichier,
  parseUploadedFichiers,
  throwUploadedFichierHttpError,
} from "$lib/server/uploadedFichier";

import type { UploadedFichier } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

// 23505 = unique_violation in PostgreSQL (duplicate phase event).
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

function throwHttpErrorForUpdate(err: unknown): never {
  if (err instanceof UploadedFichierError) throwUploadedFichierHttpError(err);
  if (isUniqueViolation(err)) {
    error(409, "An identical phase event already exists for this dossier.");
  }
  throwHttpErrorForAdminDossier(err);
}

/** The `uploads` property of the body: references to files the browser sent to storage. */
function parseUploads(value: unknown): {
  speciesFile?: UploadedFichier;
  attachments: UploadedFichier[];
} {
  if (value === undefined || value === null) return { attachments: [] };
  if (typeof value !== "object" || Array.isArray(value)) {
    error(400, "La propriété 'uploads' doit être un objet.");
  }
  const record = value as Record<string, unknown>;
  rejectUnknownProperties(record, new Set(["speciesFile", "attachments"]));
  return {
    speciesFile: parseUploadedFichier(record.speciesFile, "uploads.speciesFile"),
    attachments: parseUploadedFichiers(record.attachments, "uploads.attachments"),
  };
}

// Auth is enforced upstream by hooks.server.ts (session and permissions).
export const GET: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    return json(await getDossierDetailForAdmin(dossierId));
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);
  const { uploads: rawUploads, ...rawUpdate } = await readJsonObject(request);
  const { speciesFile, attachments } = parseUploads(rawUploads);
  if (attachments.length && !locals.user!.permissions.includes("admin:dossiers:files")) {
    error(403, "Permission requise pour gérer les pièces jointes des dossiers.");
  }
  if (speciesFile && !locals.user!.permissions.includes("admin:dossiers:species")) {
    error(403, "Permission requise pour gérer les espèces impactées des dossiers.");
  }
  const update = parseDossierUpdate(rawUpdate, await loadActiviteContext());

  if (!speciesFile && attachments.length === 0) {
    try {
      await updateDossierFromAdmin(dossierId, update, locals.user!.email);
    } catch (err) {
      throwHttpErrorForUpdate(err);
    }
    return json(await getDossierDetailForAdmin(dossierId));
  }

  const species = speciesFile ? await validateSpeciesUpload(speciesFile) : null;

  let storedSpeciesFileId: FileId | undefined;
  const storedAttachmentIds: FileId[] = [];
  let previousSpeciesFileId: FileId | undefined;

  try {
    if (species) {
      const stored = await registerUploadedFichier(species, directDatabaseConnection, {
        mediaType: species.media_type,
      });
      if (!stored.id) throw new Error("Le fichier espèces impactées n'a pas pu être enregistré.");
      storedSpeciesFileId = stored.id;
    }
    for (const attachment of attachments) {
      const stored = await registerUploadedFichier(attachment);
      if (!stored.id) throw new Error("La pièce jointe n'a pas pu être enregistrée.");
      storedAttachmentIds.push(stored.id);
    }

    await directDatabaseConnection.transaction(async (trx) => {
      const { createdInPitchou } = await getDossierSyncStatus(dossierId, trx);
      if (!createdInPitchou) throw new DossierNotCreatedInPitchouError(dossierId);

      await updateDossierFromAdminInTransaction(dossierId, update, locals.user!.email, trx);

      if (storedSpeciesFileId) {
        const current = await trx("dossier")
          .select("especes_impactees")
          .where({ id: dossierId })
          .first();
        previousSpeciesFileId = current?.especes_impactees ?? undefined;
        await trx("dossier")
          .where({ id: dossierId })
          .update({ especes_impactees: storedSpeciesFileId });
      }
      if (storedAttachmentIds.length >= 1) {
        await trx("edge_dossier__fichier_pieces_jointes_petitionnaire").insert(
          storedAttachmentIds.map((fichier) => ({ dossier: dossierId, fichier })),
        );
      }
    });
  } catch (err) {
    const storedFileIds = [
      ...(storedSpeciesFileId ? [storedSpeciesFileId] : []),
      ...storedAttachmentIds,
    ];
    if (storedFileIds.length >= 1) {
      await deleteFichiersWithoutOtherReferences(storedFileIds).catch(() => {});
    }
    throwHttpErrorForUpdate(err);
  }

  if (previousSpeciesFileId) {
    await deleteFichiersWithoutOtherReferences([previousSpeciesFileId]).catch((err) => {
      console.error("Failed to clean up the previous impacted-species file", err);
    });
  }

  return json(await getDossierDetailForAdmin(dossierId));
};

export const DELETE: RequestHandler = async ({ params }) => {
  const dossierId = parseDossierId(params.dossierId!);

  try {
    await deleteDossierFromAdmin(dossierId);
  } catch (err) {
    throwHttpErrorForAdminDossier(err);
  }

  return new Response(null, { status: 204 });
};
