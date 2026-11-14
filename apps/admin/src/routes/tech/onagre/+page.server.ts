import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { loadWorkspace } from "@pitchou/server/onagre/workspace.ts";
import { loadActivityWorkspace } from "@pitchou/server/onagre/activities.ts";
import { loadServiceMappings } from "@pitchou/server/onagre/services.ts";
import { getImportAvailability } from "@pitchou/server/onagre/import.ts";
import { listImportJobs } from "@pitchou/server/onagre/import/jobs.ts";
import type { OnagreImportRun } from "@pitchou/types/onagreImport.ts";
import type { PageServerLoad } from "./$types";
export { actions } from "../../onagre/+page.server.ts";
export const load: PageServerLoad = async ({ url }) => {
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
