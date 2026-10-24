import type { Knex } from "knex";
import type { SourceRow } from "@pitchou/types/onagre.ts";
export async function compareSnapshots(connection: Knex, selectedId: number, previousId?: number) {
  let comparison: { added: number; changed: number; unchanged: number; removed: number } | null =
    null;
  if (previousId) {
    const result = await connection.raw(
      `
      select count(*) filter (where p.source_id is null)::int as added,
        count(*) filter (where c.source_id is not null and p.source_id is not null and c.fingerprint <> p.fingerprint)::int as changed,
        count(*) filter (where c.fingerprint = p.fingerprint)::int as unchanged,
        count(*) filter (where c.source_id is null)::int as removed
      from (select source_id, fingerprint from onagre_source_demande where snapshot_id = ?) c
      full join (select source_id, fingerprint from onagre_source_demande where snapshot_id = ?) p using (source_id)
    `,
      [selectedId, previousId],
    );
    comparison = result.rows[0];
  }
  return comparison;
}
export async function browseDemandes(connection: Knex, snapshotId: number, url: URL) {
  const query = connection("onagre_source_demande").where({ snapshot_id: snapshotId });
  const search = (url.searchParams.get("q") ?? "").slice(0, 200);
  if (search)
    query.andWhere(function () {
      const pattern = `%${search.replaceAll(/[\\%_]/gu, "\\$&")}%`;
      this.whereILike("name", pattern).orWhereILike("code", pattern);
      if (/^\d{1,9}$/u.test(search)) this.orWhere("source_id", Number(search));
    });
  const [{ count }] = await query.clone().count("* as count");
  const page = Math.min(10000, Math.max(1, Number(url.searchParams.get("page")) || 1));
  const dossiers: { source_id: number; projet_id: number; name: string; code: string }[] =
    await query
      .clone()
      .select("source_id", "projet_id", "name", "code")
      .orderBy("source_id")
      .limit(25)
      .offset((Math.floor(page) - 1) * 25);
  const id = url.searchParams.get("demande");
  const dossier: { source_id: number; demande: SourceRow; projet: SourceRow } | undefined =
    id && /^\d{1,9}$/u.test(id)
      ? await connection("onagre_source_demande")
          .where({ snapshot_id: snapshotId, source_id: Number(id) })
          .first("source_id", "demande", "projet")
      : undefined;
  return { dossiers, dossierCount: Number(count), dossier: dossier ?? null };
}

export async function sourceDiagnostics(connection: Knex, snapshotId: number) {
  const result = await connection.raw(
    `select
    count(*) filter (where demande->>'datereception' is null)::int as missing_dates,
    (count(*) - count(distinct code))::int as duplicate_codes
    from onagre_source_demande where snapshot_id = ?`,
    [snapshotId],
  );
  return result.rows[0] as { missing_dates: number; duplicate_codes: number };
}
