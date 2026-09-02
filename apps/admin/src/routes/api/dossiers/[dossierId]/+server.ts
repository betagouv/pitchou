import { error, json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";
import { assertSpeciesSpreadsheet } from "@pitchou/common/especesUtils.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import {
  DossierNotCreatedInPitchouError,
  deleteDossierFromAdmin,
  getDossierSyncStatus,
  updateDossierFromAdmin,
  updateDossierFromAdminInTransaction,
} from "@pitchou/server/database/dossier_admin.ts";
import {
  deleteFichiersWithoutOtherReferences,
  storeNewFichier,
} from "@pitchou/server/database/fichier.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import { readJsonObject } from "$lib/server/requestValidation";
import { speciesFileError, speciesFileMediaType } from "$lib/speciesFile.ts";
import {
  parseDossierId,
  parseDossierUpdate,
  throwHttpErrorForAdminDossier,
} from "$lib/server/dossierValidation";
import { loadActiviteContext } from "$lib/server/dossierValidation/activiteContext.ts";

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

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
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
  const multipart = request.headers.get("content-type")?.includes("multipart/form-data") ?? false;
  let rawUpdate: Record<string, unknown>;
  let speciesFile: File | null = null;
  let attachments: File[] = [];

  if (multipart) {
    const form = await request.formData();
    const payload = form.get("payload");
    if (typeof payload !== "string") error(400, "Champ 'payload' manquant.");
    try {
      const parsed: unknown = JSON.parse(payload);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      rawUpdate = parsed as Record<string, unknown>;
    } catch {
      error(400, "Champ 'payload' invalide.");
    }
    const uploadedSpeciesFile = form.get("speciesFile");
    if (uploadedSpeciesFile instanceof File) speciesFile = uploadedSpeciesFile;
    attachments = form
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);
  } else {
    rawUpdate = await readJsonObject(request);
  }

  const update = parseDossierUpdate(rawUpdate, await loadActiviteContext());

  if (!multipart) {
    try {
      await updateDossierFromAdmin(dossierId, update, locals.user!.email);
    } catch (err) {
      if (isUniqueViolation(err)) {
        error(409, "An identical phase event already exists for this dossier.");
      }
      throwHttpErrorForAdminDossier(err);
    }

    return json(await getDossierDetailForAdmin(dossierId));
  }

  const uploadSize = attachments.reduce((total, file) => total + file.size, speciesFile?.size ?? 0);
  if (uploadSize > 65 * 1024 * 1024) {
    error(400, "La taille totale des fichiers ne doit pas dépasser 65 Mo.");
  }
  if (speciesFile) {
    const fileError = speciesFileError(speciesFile);
    if (fileError) error(400, fileError);
  }
  const speciesContent = speciesFile ? await speciesFile.arrayBuffer() : null;
  if (speciesContent) {
    try {
      await assertSpeciesSpreadsheet(speciesContent);
    } catch (validationError) {
      error(
        400,
        validationError instanceof Error ? validationError.message : "Le tableur n'est pas valide.",
      );
    }
  }

  let storedSpeciesFileId: FileId | undefined;
  const storedAttachmentIds: FileId[] = [];
  let previousSpeciesFileId: FileId | undefined;

  try {
    if (speciesFile && speciesContent) {
      const stored = await storeNewFichier({
        name: speciesFile.name,
        media_type: speciesFileMediaType(speciesFile.name),
        content: Buffer.from(speciesContent),
      });
      if (!stored.id) throw new Error("Le fichier espèces impactées n'a pas pu être enregistré.");
      storedSpeciesFileId = stored.id;
    }
    for (const attachment of attachments) {
      const stored = await storeNewFichier({
        name: attachment.name,
        media_type: attachment.type || null,
        content: Buffer.from(await attachment.arrayBuffer()),
      });
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
    if (isUniqueViolation(err)) {
      error(409, "An identical phase event already exists for this dossier.");
    }
    throwHttpErrorForAdminDossier(err);
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
