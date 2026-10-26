import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";
import type { SourceRow } from "@pitchou/types/onagre.ts";
import { OnagreImportError } from "./policy.ts";

export type Source = {
  snapshot_id: number;
  source_id: number;
  projet_id: number;
  code: string;
  name: string;
  fingerprint: string;
  demande: SourceRow;
  projet: SourceRow;
  references?: Record<string, SourceRow[]>;
};
export type FrozenInput = {
  preview: OnagreImportPreview;
  snapshot: Record<string, unknown>;
  mappings: Record<string, unknown>[];
  mappingRevisions: Record<string, unknown>[];
  sharedRules: Record<string, unknown>[];
  sharedRuleRevisions: Record<string, unknown>[];
  schema: Record<string, unknown>[];
  activities: { code: string; label: string; usable: boolean }[];
  sources: (Source | null)[];
  targets: unknown[];
};
export type CachedPreview = { input: FrozenInput; actorId: number };
const previews = new Map<string, CachedPreview>();
export const PREVIEW_TTL_MS = 15 * 60 * 1000;

export function cachePreview(value: CachedPreview) {
  for (const [id, entry] of previews)
    if (Date.parse(entry.input.preview.expiresAt) <= Date.now()) previews.delete(id);
  while (previews.size >= 100) previews.delete(previews.keys().next().value!);
  previews.set(value.input.preview.previewId, structuredClone(value));
}

export function getCachedPreview(id: string, actorId: number): FrozenInput {
  const cached = previews.get(id);
  if (!cached || Date.parse(cached.input.preview.expiresAt) <= Date.now()) {
    previews.delete(id);
    throw new OnagreImportError("Cet aperçu a expiré ou le serveur a redémarré. Recréez-le.", 409);
  }
  if (cached.actorId !== actorId)
    throw new OnagreImportError("Cet aperçu appartient à un autre administrateur.", 403);
  return structuredClone(cached.input);
}
