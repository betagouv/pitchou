import { technicalTabs } from "./navigation.ts";
import { loadReviewSummary } from "@pitchou/server/onagre/reviewSummary.ts";
import { fail, isHttpError, redirect } from "@sveltejs/kit";
import {
  loadCommentWorkspace,
  parseCommentDecision,
  saveCommentDecision,
} from "@pitchou/server/onagre/comments.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import { parseSharedRule, saveSharedRule } from "@pitchou/server/onagre/sharedRules.ts";
import { stagePackage } from "@pitchou/server/onagre/package.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import type { Actions, PageServerLoad } from "./$types";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { parseQuestion, saveQuestion } from "@pitchou/server/onagre/questions.ts";
import { parseServiceDecision, saveServiceMapping } from "@pitchou/server/onagre/services.ts";
import { loadConfirmedDuplicates } from "@pitchou/server/onagre/confirmedDuplicates.ts";
import {
  loadDuplicateWorkspace,
  parseDuplicateDecision,
  saveDuplicateDecision,
} from "@pitchou/server/onagre/duplicates.ts";

export const load: PageServerLoad = async ({ url }) => {
  const tab = url.searchParams.get("tab") ?? "accueil";
  if (technicalTabs.includes(tab)) {
    const params = new URLSearchParams(url.searchParams);
    if (tab === "sources") params.set("tab", "synthese");
    redirect(303, `/tech/onagre?${params}`);
  }
  return {
    summary: await loadReviewSummary(db),
    commentWorkspace: tab === "textes" ? await loadCommentWorkspace(db, url) : null,
    confirmedDuplicates: tab === "doublons-evites" ? await loadConfirmedDuplicates(db) : [],
    duplicateWorkspace:
      tab === "doublons" ? await loadDuplicateWorkspace(db, { reviewedLocations: true }) : null,
  };
};
const failure = (cause: unknown) => {
  if (isHttpError(cause)) throw cause;
  if (cause instanceof MappingConflict) return fail(409, { message: cause.message });
  return fail(400, {
    message: cause instanceof Error ? cause.message : "Enregistrement impossible.",
  });
};
export const actions: Actions = {
  saveComment: async ({ request, locals }) => {
    try {
      const input = parseCommentDecision(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveCommentDecision(trx, actor.id, input),
      );
      return { message: "Proposition enregistrée. Aucun dossier modifié." };
    } catch (cause) {
      return failure(cause);
    }
  },
  saveDuplicate: async ({ request, locals }) => {
    try {
      const input = parseDuplicateDecision(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveDuplicateDecision(trx, actor.id, input),
      );
      return { message: "Décision enregistrée. Aucun import lancé." };
    } catch (cause) {
      return failure(cause);
    }
  },
  saveQuestion: async ({ request, locals }) => {
    try {
      const input = parseQuestion(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveQuestion(trx, actor.id, input),
      );
      return { message: "Question enregistrée." };
    } catch (cause) {
      return failure(cause);
    }
  },
  saveService: async ({ request, locals }) => {
    try {
      const decision = parseServiceDecision(await request.formData());
      await withAdminWriteAccess(locals, "admin:onagre:manage", (trx, actor) =>
        saveServiceMapping(trx, actor.id, decision),
      );
      return { message: "Correspondance de service enregistrée." };
    } catch (cause) {
      return failure(cause);
    }
  },
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
