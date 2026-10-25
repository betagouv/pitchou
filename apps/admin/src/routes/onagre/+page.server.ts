import { fail, isHttpError, redirect } from "@sveltejs/kit";
import { loadActivityWorkspace } from "@pitchou/server/onagre/activities.ts";
import { loadWorkspace } from "@pitchou/server/onagre/workspace.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import { parseSharedRule, saveSharedRule } from "@pitchou/server/onagre/sharedRules.ts";
import { stagePackage } from "@pitchou/server/onagre/package.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import type { Actions, PageServerLoad } from "./$types";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { getImportAvailability } from "@pitchou/server/onagre/import.ts";
import { listImportJobs } from "@pitchou/server/onagre/import/jobs.ts";
import {
  loadServiceMappings,
  parseServiceDecision,
  saveServiceMapping,
} from "@pitchou/server/onagre/services.ts";
import type { OnagreImportRun } from "@pitchou/types/onagreImport.ts";

export const load: PageServerLoad = async ({ url }) => {
  if (url.searchParams.get("tab") === "sources") {
    const params = new URLSearchParams({ tab: "synthese" });
    const snapshot = url.searchParams.get("snapshot");
    if (snapshot) params.set("snapshot", snapshot);
    redirect(303, `/onagre?${params}`);
  }
  const rehearsal = process.env.ONAGRE_DEPLOYMENT_ROLE === "rehearsal";
  const [workspace, importRuns, importJobs] = await Promise.all([
    loadWorkspace(url),
    rehearsal && url.searchParams.get("tab") === "import"
      ? db<{ report: OnagreImportRun }>("onagre_import_run")
          .select("report")
          .whereNull("job_id")
          .orderBy("created_at", "desc")
          .limit(10)
          .then((rows) => rows.map((row) => row.report))
      : [],
    rehearsal && url.searchParams.get("tab") === "import" ? listImportJobs(db) : [],
  ]);
  return {
    ...workspace,
    activityWorkspace: ["activites", "correspondances"].includes(url.searchParams.get("tab") ?? "")
      ? await loadActivityWorkspace(db, workspace.mappings)
      : null,
    servicesWorkspace:
      url.searchParams.get("tab") === "services" && workspace.selected?.records_complete
        ? await loadServiceMappings(db, workspace.selected.id)
        : null,
    deploymentRole: rehearsal ? "rehearsal" : "workspace",
    importEnabled: getImportAvailability().enabled,
    importRuns,
    importJobs,
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
