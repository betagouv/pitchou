import { createHash } from "node:crypto";
import type { Knex } from "knex";
import type { DuplicateProject, DuplicateReview } from "@pitchou/types/onagreDuplicates.ts";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const isHash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error("Invalid duplicate review bundle");
}
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 20000;
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
const positiveId = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
function facts(value: Record<string, unknown>) {
  requireValue(text(value.reference) && (value.deposit === null || text(value.deposit)));
  requireValue(strings(value.signatures) && strings(value.departments) && strings(value.communes));
}

export function parseDuplicateBundle(value: unknown): DuplicateReview[] {
  requireValue(
    value &&
      typeof value === "object" &&
      "format" in value &&
      value.format === "pitchou-onagre-duplicate-review-v1",
  );
  requireValue(
    "projects" in value &&
      Array.isArray(value.projects) &&
      value.projects.length > 0 &&
      value.projects.length <= 10000,
  );
  const ids = new Set<string>(),
    keys = new Set<string>();
  return value.projects.map((row) => {
    requireValue(row && typeof row === "object");
    const p = row.payload;
    requireValue(p && typeof p === "object" && text(p.projectId) && /^\d+$/u.test(p.projectId));
    requireValue(row.project_id === p.projectId && !ids.has(p.projectId));
    ids.add(p.projectId);
    requireValue(isHash(p.sourceHash) && isHash(row.review_hash) && row.review_hash === hash(p));
    requireValue(
      text(p.name) && text(p.reason) && p.reason.trim() && text(p.question) && p.question.trim(),
    );
    requireValue(
      strings(p.omittedDemandeIds) &&
        Array.isArray(p.candidates) &&
        Array.isArray(p.demandes) &&
        p.demandes.length > 0,
    );
    for (const d of p.demandes) {
      requireValue(d && typeof d === "object" && text(d.key) && !keys.has(d.key));
      requireValue(/^onagre-national:(?:demandes:\d+|projet:\d+:initial-demande)$/u.test(d.key));
      requireValue(text(d.id) && text(d.linkReason) && text(d.question) && d.question.trim());
      requireValue(d.linkedDossierId === null || positiveId(d.linkedDossierId));
      keys.add(d.key);
      facts(d);
    }
    for (const c of p.candidates) {
      requireValue(
        c && typeof c === "object" && positiveId(c.id) && text(c.name) && text(c.relationship),
      );
      facts(c);
    }
    return {
      project_id: p.projectId,
      review_hash: row.review_hash,
      payload: p as DuplicateProject,
    };
  });
}

export async function stageDuplicateBundle(trx: Knex.Transaction, value: unknown) {
  const rows = parseDuplicateBundle(value);
  await trx.raw("select pg_advisory_xact_lock(?)", [2105102026]);
  const existing = await trx<DuplicateReview>("onagre_duplicate_project").select("*");
  const byId = new Map(existing.map((row) => [row.project_id, row]));
  const byKey = new Map(
    existing.flatMap((row) => row.payload.demandes.map((d) => [d.key, row.project_id] as const)),
  );
  let inserted = 0;
  for (const row of rows) {
    const before = byId.get(row.project_id);
    if (before && before.review_hash !== row.review_hash)
      throw new Error(
        `Review ${row.project_id} already exists with different evidence; decisions must be reconciled explicitly.`,
      );
    for (const demande of row.payload.demandes)
      if (byKey.has(demande.key) && byKey.get(demande.key) !== row.project_id)
        throw new Error(`Demande ${demande.key} already belongs to another review.`);
    if (!before) {
      await trx("onagre_duplicate_project").insert(row);
      inserted++;
    }
  }
  return { projects: rows.length, inserted, unchanged: rows.length - inserted };
}
