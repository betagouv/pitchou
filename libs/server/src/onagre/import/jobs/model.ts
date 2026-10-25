import type {
  OnagreImportCounts,
  OnagreImportJob,
  OnagreImportPreview,
} from "@pitchou/types/onagreImport.ts";
import type { FrozenInput } from "../state.ts";
import { hash, OnagreImportError, POLICY } from "../policy.ts";

export const BATCH_SIZE = 100;
export const emptyCounts = (): OnagreImportCounts => ({
  ready: 0,
  blocked: 0,
  conflict: 0,
  already_imported: 0,
  created: 0,
  omitted: 0,
});
export type Context = Omit<FrozenInput, "sources" | "targets" | "preview"> & {
  policy: typeof POLICY;
};
export type Job = {
  id: string;
  actor_id: number;
  apply_actor_id: number | null;
  snapshot_id: number;
  status: OnagreImportJob["status"];
  total: number;
  analyzed: number;
  processed: number;
  counts: OnagreImportCounts;
  context: Context;
  context_hash: string;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};
export type Batch = {
  job_id: string;
  position: number;
  record_ids: string[];
  preview: OnagreImportPreview | null;
  frozen_input: Pick<FrozenInput, "sources" | "targets"> | null;
  run_id: string | null;
};
export function contextOf(input: Omit<FrozenInput, "preview">): Context {
  const { sources: _sources, targets: _targets, ...context } = input;
  return { ...context, policy: POLICY };
}
export function assertContext(job: Job, input: Omit<FrozenInput, "preview">) {
  if (hash(contextOf(input)) !== job.context_hash)
    throw new OnagreImportError(
      "Le dump, les correspondances ou le profil ont changé. Lancez une nouvelle analyse. Les dossiers déjà créés sont conservés.",
      409,
    );
}
export function assertRehearsal() {
  if (process.env.ONAGRE_DEPLOYMENT_ROLE !== "rehearsal")
    throw new OnagreImportError(
      "Cette opération est réservée à l'environnement de répétition.",
      403,
    );
}
export function toPublic(job: Job): OnagreImportJob {
  return {
    id: job.id,
    actorId: job.actor_id,
    snapshotId: job.snapshot_id,
    status: job.status,
    total: job.total,
    analyzed: job.analyzed,
    processed: job.processed,
    counts: job.counts,
    error: job.error,
    createdAt: new Date(job.created_at).toISOString(),
    updatedAt: new Date(job.updated_at).toISOString(),
    policy: job.context.policy,
  };
}
