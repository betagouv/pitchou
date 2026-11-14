import { createHash } from "node:crypto";
import type { Knex } from "knex";
import {
  confirmationLabels,
  type ConfirmedDuplicate,
} from "@pitchou/types/onagreConfirmedDuplicates.ts";

type Row = { demande_key: string; evidence_hash: string; payload: ConfirmedDuplicate };
const hash = (payload: unknown) =>
  createHash("sha256").update(JSON.stringify(payload)).digest("hex");
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 20000;
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new Error("Invalid confirmed duplicate evidence");
}

export function parseConfirmedDuplicates(value: unknown): Row[] {
  requireValue(
    value &&
      typeof value === "object" &&
      "format" in value &&
      value.format === "pitchou-onagre-confirmed-duplicates-v1",
  );
  requireValue(
    "links" in value &&
      Array.isArray(value.links) &&
      value.links.length > 0 &&
      value.links.length <= 50000,
  );
  const keys = new Set<string>();
  return value.links.map((p) => {
    requireValue(p && typeof p === "object" && text(p.demandeKey) && !keys.has(p.demandeKey));
    requireValue(
      /^onagre-national:(?:demandes:\d+|projet:\d+:initial-demande)$/u.test(p.demandeKey),
    );
    requireValue(text(p.projectId) && /^\d+$/u.test(p.projectId) && text(p.projectName));
    requireValue(text(p.sourceHash) && /^[a-f0-9]{64}$/u.test(p.sourceHash));
    requireValue(text(p.confirmedAt) && Number.isFinite(Date.parse(p.confirmedAt)));
    requireValue(Object.hasOwn(confirmationLabels, p.profile) && text(p.reason) && p.reason.trim());
    requireValue(Number.isSafeInteger(p.otherDemandesToReview) && p.otherDemandesToReview >= 0);
    for (const facts of [p.source, p.target]) {
      requireValue(facts && typeof facts === "object" && text(facts.reference));
      requireValue(facts.deposit === null || text(facts.deposit));
      requireValue(
        strings(facts.signatures) && strings(facts.departments) && strings(facts.communes),
      );
    }
    requireValue(
      text(p.source.id) &&
        Number.isSafeInteger(p.target.id) &&
        p.target.id > 0 &&
        text(p.target.name),
    );
    requireValue(
      Array.isArray(p.relatedExisting) &&
        p.relatedExisting.every(
          (r: { dossierId: number; reason: string }) =>
            r && Number.isSafeInteger(r.dossierId) && r.dossierId > 0 && text(r.reason),
        ),
    );
    keys.add(p.demandeKey);
    return { demande_key: p.demandeKey, evidence_hash: hash(p), payload: p as ConfirmedDuplicate };
  });
}

export async function loadConfirmedDuplicates(db: Knex): Promise<ConfirmedDuplicate[]> {
  const rows = await db<Row>("onagre_confirmed_duplicate").select("payload").orderBy("demande_key");
  return rows.map((row) => row.payload);
}

export async function stageConfirmedDuplicates(trx: Knex.Transaction, value: unknown) {
  const rows = parseConfirmedDuplicates(value);
  await trx.raw("select pg_advisory_xact_lock(?)", [2105102026]);
  const existing = new Map(
    (await trx<Row>("onagre_confirmed_duplicate").select("demande_key", "evidence_hash")).map(
      (row) => [row.demande_key, row.evidence_hash],
    ),
  );
  let inserted = 0;
  for (const row of rows) {
    if (existing.has(row.demande_key)) {
      if (existing.get(row.demande_key) !== row.evidence_hash)
        throw new Error(`Confirmed duplicate ${row.demande_key} has changed evidence.`);
    } else {
      await trx("onagre_confirmed_duplicate").insert(row);
      inserted++;
    }
  }
  return { links: rows.length, inserted, unchanged: rows.length - inserted };
}
