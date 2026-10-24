import { fail, isHttpError } from "@sveltejs/kit";
import { loadWorkspace } from "@pitchou/server/onagre/workspace.ts";
import { parseBundle, parseDecision } from "@pitchou/server/onagre/validation.ts";
import { stageSnapshot } from "@pitchou/server/onagre/snapshots.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url }) => loadWorkspace(url);
const failure = (cause: unknown) => {
  if (isHttpError(cause)) throw cause;
  if (cause instanceof MappingConflict) return fail(409, { message: cause.message });
  return fail(400, {
    message: cause instanceof Error ? cause.message : "Enregistrement impossible.",
  });
};
export const actions: Actions = {
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
        return fail(400, { message: "Sélectionnez un paquet JSON de 64 Mo maximum." });
      const bundle = parseBundle(JSON.parse(await file.text()));
      const result = await withAdminWriteAccess(locals, "admin:onagre:manage", (trx) =>
        stageSnapshot(trx, bundle),
      );
      return {
        message: result.duplicate
          ? "Ce dump est déjà chargé. Les correspondances sont conservées."
          : "Dump chargé dans l'espace de préparation. Aucun dossier Pitchou créé.",
      };
    } catch (cause) {
      return failure(cause);
    }
  },
};
