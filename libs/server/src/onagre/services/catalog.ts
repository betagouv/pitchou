import type { Knex } from "knex";
import { uuid } from "../import/policy.ts";

export async function replaceGroupCatalog(trx: Knex.Transaction, input: unknown) {
  const data = input as {
    source: string;
    refreshedAt: string;
    groups: {
      id: string;
      name: string;
      active: boolean;
      coverage_needs_review: boolean;
      departments: string[];
    }[];
  };
  if (
    !data ||
    !data.source ||
    !Number.isFinite(Date.parse(data.refreshedAt)) ||
    !Array.isArray(data.groups) ||
    data.groups.length === 0
  )
    throw new Error("Invalid group catalogue");
  const rows = data.groups.map((group) => {
    uuid(group.id);
    if (
      typeof group.name !== "string" ||
      !group.name.trim() ||
      typeof group.active !== "boolean" ||
      typeof group.coverage_needs_review !== "boolean" ||
      !Array.isArray(group.departments) ||
      group.departments.some((d) => typeof d !== "string")
    )
      throw new Error("Invalid catalogue group");
    return {
      id: group.id,
      name: group.name,
      active: group.active,
      coverage_needs_review: group.coverage_needs_review,
      departments: JSON.stringify(group.departments),
      source: data.source,
      refreshed_at: data.refreshedAt,
    };
  });
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error("Duplicate catalogue IDs");
  await trx.raw("select pg_advisory_xact_lock(01112026)");
  // Keep removed groups visible as inactive so existing decisions remain understandable.
  await trx("onagre_group_catalog")
    .whereNotIn(
      "id",
      rows.map((row) => row.id),
    )
    .update({ active: false, refreshed_at: data.refreshedAt });
  await trx("onagre_group_catalog").insert(rows).onConflict("id").merge();
}
