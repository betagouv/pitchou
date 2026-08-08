import { error, json } from "@sveltejs/kit";
import { phases } from "@pitchou/common/phases.ts";
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
import { speciesFileMediaType } from "$lib/speciesFile.ts";
import { throwHttpErrorForAdminDossier } from "$lib/server/dossierValidation";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { RequestHandler } from "./$types";
import { parseDossierCreationUpload } from "./dossierCreationUpload.ts";

function parsePhaseFilter(value: string | null): DossierPhase | undefined {
  if (!value) return undefined;
  if (!phases.has(value as DossierPhase)) error(400, `Phase inconnue : '${value}'.`);
  return value as DossierPhase;
}

function parseSourceFilter(value: string | null): ListAdminDossiersOptions["source"] {
  if (!value) return undefined;
  if (value !== "pitchou" && value !== "dn" && value !== "unknown")
    error(400, `Source inconnue : '${value}'.`);
  return value;
}

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
  const { creation, speciesFile, speciesContent, attachments } =
    await parseDossierCreationUpload(request);
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
      if (storedFileId)
        await trx("dossier").where({ id: created.id }).update({ especes_impactees: storedFileId });
      if (storedAttachmentIds.length)
        await trx("edge_dossier__fichier_pieces_jointes_petitionnaire").insert(
          storedAttachmentIds.map((fichier) => ({ dossier: created.id, fichier })),
        );
      return created;
    });
    return json({ id }, { status: 201 });
  } catch (caught) {
    if (storedFileId || storedAttachmentIds.length) {
      await deleteFichiersWithoutOtherReferences([
        ...(storedFileId ? [storedFileId] : []),
        ...storedAttachmentIds,
      ]).catch(() => {});
    }
    throwHttpErrorForAdminDossier(caught);
  }
};
