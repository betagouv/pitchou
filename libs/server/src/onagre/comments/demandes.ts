import type { Knex } from "knex";
import type { CommentDemandePage, CommentGroup } from "@pitchou/types/onagreComments.ts";
import { loadCommentEvidence } from "./evidence.ts";

export async function loadCommentDemandes(
  db: Knex,
  groupId: string,
  requestedPage: number,
  instructeurUrl: string,
): Promise<CommentDemandePage | null> {
  const group = await db<CommentGroup>("onagre_comment_group").where("id", groupId).first();
  if (!group) return null;
  const keys = [...new Set(group.payload.demandeKeys)].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  const pageSize = 20;
  const total = keys.length;
  const page = Math.min(
    Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const selectedKeys = keys.slice((page - 1) * pageSize, page * pageSize);
  const [{ references, dossiers }, evidence] = await Promise.all([
    resolveDossiers(db, selectedKeys),
    loadCommentEvidence(db, group, selectedKeys),
  ]);
  return {
    total,
    page,
    pageSize,
    items: selectedKeys.map((key) => {
      const ids = new Set(references.filter((ref) => ref.key === key).map((ref) => Number(ref.id)));
      return {
        key,
        explanations: evidence.get(key) ?? [],
        label: key.endsWith(":initial-demande")
          ? `Demande initiale · projet Onagre ${key.split(":")[2]}`
          : `Demande Onagre ${key.split(":").at(-1)}`,
        dossiers: dossiers
          .filter((dossier) => ids.has(dossier.id))
          .sort((a, b) => a.id - b.id)
          .map((dossier) => ({
            id: dossier.id,
            name: dossier.name,
            url: new URL(`/dossier/${dossier.id}`, instructeurUrl).href,
          })),
      };
    }),
  };
}

async function resolveDossiers(db: Knex, selectedKeys: string[]) {
  const references: { key: string; id: string | number }[] = [];
  const [hasLocal, hasReconciled, hasApplication] = await Promise.all([
    db.schema.withSchema("onagre_local_import").hasTable("identity"),
    db.schema.withSchema("onagre_local_import").hasTable("reconciled_demande"),
    db.schema.hasTable("onagre_import_identity"),
  ]);
  if (hasLocal) {
    references.push(
      ...(await db("onagre_local_import.identity")
        .select({ key: "source_key", id: "target_id" })
        .where("table_name", "dossier")
        .whereIn("source_key", selectedKeys)),
    );
  }
  if (hasReconciled) {
    references.push(
      ...(await db("onagre_local_import.reconciled_demande")
        .select({ key: "source_key", id: "dossier_id" })
        .whereIn("source_key", selectedKeys)),
    );
  }
  if (hasApplication) {
    const ids = selectedKeys
      .filter((key) => /^onagre-national:demandes:\d+$/u.test(key))
      .map((key) => Number(key.split(":").at(-1)));
    const rows = await db("onagre_import_identity")
      .select("source_id", "dossier_id")
      .where("source_instance", "onagre-national")
      .whereIn("source_id", ids);
    references.push(
      ...rows.map((row) => ({
        key: `onagre-national:demandes:${row.source_id}`,
        id: row.dossier_id,
      })),
    );
  }
  // Only persisted import/reconciliation identities can produce an instructeur link.
  const dossiers = await db("dossier")
    .select("id", "name")
    .whereIn("id", [...new Set(references.map((ref) => Number(ref.id)))]);
  return { references, dossiers };
}
