import { fail, isHttpError } from "@sveltejs/kit";
import { loadWorkspace } from "@pitchou/server/onagre/workspace.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import { parseSharedRule, saveSharedRule } from "@pitchou/server/onagre/sharedRules.ts";
import { stagePackage } from "@pitchou/server/onagre/package.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import type { Actions, PageServerLoad } from "./$types";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { listDocuments, browseDocument } from "@pitchou/server/onagre/documents.ts";

export const load: PageServerLoad = async ({ url }) => {
  const sources = url.searchParams.get("tab") === "sources";
  const [workspace, documents, sourceDocument] = await Promise.all([
    loadWorkspace(url),
    sources ? listDocuments(db) : [],
    sources ? browseDocument(db, url) : null,
  ]);
  return { ...workspace, documents, sourceDocument };
};
const failure = (cause: unknown) => {
  if (isHttpError(cause)) throw cause;
  if (cause instanceof MappingConflict) return fail(409, { message: cause.message });
  return fail(400, {
    message: cause instanceof Error ? cause.message : "Enregistrement impossible.",
  });
};
export const actions: Actions = {
  saveSharedRule: async ({ request, locals }) => {
    try {
      const decision = parseSharedRule(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveSharedRule(trx, actor.id, decision),
      );
      return { message: "Règle commune enregistrée." };
    } catch (cause) {
      return failure(cause);
    }
  },
  save: async ({ request, locals }) => {
    try {
      const decision = parseDecision(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveMapping(trx, actor.id, decision),
      );
      return { message: "Correspondance enregistrée.", savedKey: decision.key };
    } catch (cause) {
      return failure(cause);
    }
  },
  upload: async ({ request, locals }) => {
    try {
      const form = await request.formData();
      const file = form.get("bundle");
      if (!(file instanceof File) || file.size === 0 || file.size > 64 * 1024 * 1024)
        return fail(400, { message: "Sélectionnez un paquet JSON ou JSONL.gz de 64 Mo maximum." });
      const magic = new Uint8Array(await file.slice(0, 2).arrayBuffer());
      const result = await withAdminWriteAccess(locals, "admin:onagre:manage", (trx) =>
        stagePackage(trx, file.stream(), magic[0] === 0x1f && magic[1] === 0x8b),
      );
      return {
        message: result.duplicate
          ? "Dump déjà chargé. Son contenu est disponible ; les correspondances sont conservées."
          : "Dump chargé dans l'espace de préparation. Aucun dossier Pitchou créé.",
        snapshotId: result.id,
      };
    } catch (cause) {
      return failure(cause);
    }
  },
};
