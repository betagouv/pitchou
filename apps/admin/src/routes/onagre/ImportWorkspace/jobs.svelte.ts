import type { OnagreImportJob, OnagreImportJobPage } from "@pitchou/types/onagreImport.ts";

export const jobLabels = {
  analyzing: "Analyse en cours",
  review: "Analyse terminée",
  importing: "Import en cours",
  completed: "Import terminé",
  failed: "Opération interrompue",
  cancelled: "Opération arrêtée",
};
export const recordLabels = {
  ready: "Prête à importer",
  blocked: "Bloquée",
  conflict: "Conflit",
  already_imported: "Déjà importée",
  created: "Dossier créé",
  omitted: "Non importée",
};
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    let message = "Requête interrompue. Actualisez le suivi pour vérifier l'état de l'opération.";
    if (response.headers.get("content-type")?.includes("application/json"))
      message = (await response.json()).message ?? message;
    throw new Error(message);
  }
  return response.json();
}
export class ImportJobsModel {
  jobs = $state<OnagreImportJob[]>([]);
  detail = $state<OnagreImportJobPage | null>(null);
  busy = $state(false);
  error = $state("");
  private disposed = false;
  constructor(jobs: OnagreImportJob[]) {
    this.jobs = jobs;
  }
  dispose() {
    this.disposed = true;
  }
  async load(id: string, page = 1) {
    if (this.busy || this.disposed) return;
    this.busy = true;
    try {
      const detail = await request<OnagreImportJobPage>(
        `/onagre/import-jobs?jobId=${encodeURIComponent(id)}&page=${page}`,
      );
      if (!this.disposed) {
        this.detail = detail;
        this.replace(detail.job);
        this.error = "";
      }
    } catch (cause) {
      if (!this.disposed) this.error = (cause as Error).message;
    } finally {
      this.busy = false;
    }
  }
  async act(action: "analyze" | "import" | "cancel", snapshotId: number) {
    if (this.busy) return;
    this.busy = true;
    let succeeded = false;
    try {
      const job = await request<OnagreImportJob>("/onagre/import-jobs", {
        action,
        snapshotId,
        jobId: this.detail?.job.id,
      });
      if (!this.disposed) {
        this.replace(job);
        this.detail = { job, records: [], page: 1, pages: 1 };
        this.error = "";
        succeeded = true;
      }
    } catch (cause) {
      if (!this.disposed) this.error = (cause as Error).message;
    } finally {
      this.busy = false;
    }
    if (succeeded && this.detail && !this.disposed) await this.load(this.detail.job.id);
  }
  async refresh() {
    if (this.busy || this.disposed) return;
    // Refresh the shared list too: another team member may have started a job.
    this.busy = true;
    try {
      const jobs = await request<OnagreImportJob[]>("/onagre/import-jobs");
      if (!this.disposed) this.jobs = jobs;
    } catch (cause) {
      if (!this.disposed) this.error = (cause as Error).message;
    } finally {
      this.busy = false;
    }
    const id = this.detail?.job.id ?? this.jobs[0]?.id;
    if (id) await this.load(id, this.detail?.page ?? 1);
  }
  private replace(job: OnagreImportJob) {
    this.jobs = [job, ...this.jobs.filter((row) => row.id !== job.id)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);
  }
}
