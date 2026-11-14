import type { Knex } from "knex";
import type { SourceRow } from "@pitchou/types/onagre.ts";
import type { Source } from "./state.ts";
import type { Target } from "./records.ts";
import { SOURCE_INSTANCE } from "./policy.ts";
import { createOnagreMatcher, normalizeOnagreReference } from "../reconciliation.ts";

export async function captureTargets(
  connection: Knex,
  snapshotId: number,
  ids: string[],
  sources: (Source | null)[],
): Promise<Target[]> {
  if (ids.length === 0) return [];
  const ownedRows = await connection("onagre_import_identity")
    .where({ source_instance: SOURCE_INSTANCE })
    .select("dossier_id");
  const identities = await connection("onagre_import_identity")
    .where({ source_instance: SOURCE_INSTANCE })
    .whereIn("source_id", ids.map(Number));
  const existing = await connection("dossier")
    .select("id", "name", "onagre_demande_identifier", "departments", "primary_department")
    .orderBy("id");
  const owned = new Set(ownedRows.map((row) => row.dossier_id));
  const match = createOnagreMatcher(existing.filter((row) => !owned.has(row.id)));
  // Include sibling references: a project-level overlap must not be bypassed by batch selection.
  const demandes: { source_id: number; projet_id: number; code: string | null }[] =
    await connection("onagre_source_demande")
      .where({ snapshot_id: snapshotId })
      .select("source_id", "projet_id", connection.raw("demande->>'codedemande' as code"));
  const departments: { content: SourceRow }[] = await connection("onagre_source_row")
    .where({ snapshot_id: snapshotId, table_name: "departements" })
    .select("content");
  const counts = new Map<string, number>();
  const siblings = new Map<number, { id: string; code: string | null }[]>();
  for (const d of demandes) {
    const code = normalizeOnagreReference(d.code);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    if (!siblings.has(d.projet_id)) siblings.set(d.projet_id, []);
    siblings.get(d.projet_id)!.push({ id: String(d.source_id), code: d.code });
  }
  const matches = sources.map((source) => {
    if (!source) return [];
    const department = departments.find(
      (row) => row.content.departementsid === source.demande.departementsid,
    )?.content.codedept;
    return match({
      projectId: String(source.projet_id),
      projectCode: source.projet.codeprojet,
      name: source.projet.nomprojet,
      departments: department ? [department] : [],
      demandes: siblings.get(source.projet_id) ?? [],
    });
  });
  const candidateIds = new Set(matches.flatMap((rows) => rows.map((row) => row.dossierId)));
  for (const identity of identities)
    if (ids.includes(String(identity.source_id))) candidateIds.add(identity.dossier_id);
  // Only matched records need complete JSON, preserving exact PostgreSQL timestamps for replay.
  const dossiers =
    candidateIds.size > 0
      ? await connection("dossier")
          .whereIn("id", [...candidateIds])
          .select(connection.raw("to_jsonb(dossier) as content"))
          .orderBy("id")
      : [];
  return ids.map((id, index) => {
    const identity = identities.find((row) => row.source_id === Number(id)) ?? null;
    const candidateIds = new Set(matches[index].map((row) => row.dossierId));
    if (identity) candidateIds.add(identity.dossier_id);
    return {
      identity,
      dossier: dossiers.find((row) => row.content.id === identity?.dossier_id)?.content ?? null,
      candidates: dossiers
        .filter((row) => candidateIds.has(row.content.id))
        .map((row) => row.content),
      duplicateSources:
        counts.get(normalizeOnagreReference(sources[index]?.demande.codedemande)) ?? 0,
      matches: matches[index],
    };
  });
}
