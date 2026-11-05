import type { Knex } from "knex";
import {
  filterError,
  filterOperators,
  maxFilters,
  numericPattern,
  type SourceFilter,
} from "@pitchou/common/onagre/filters.ts";

export function readFilters(params: URLSearchParams, columns: string[]) {
  const raw = params.get("filters");
  if (!raw) return { filters: [] as SourceFilter[], error: null };
  try {
    if (raw.length > 16000) throw new Error("Trop de filtres.");
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > maxFilters)
      throw new Error("Liste de filtres invalide.");
    const filters: SourceFilter[] = value.map((filter) => {
      if (
        !filter ||
        !columns.includes(filter.column) ||
        !filterOperators.some((op) => op.value === filter.operator) ||
        typeof filter.value !== "string" ||
        filter.value.length > 200
      )
        throw new Error("Colonne ou filtre invalide.");
      const error = filterError(filter);
      if (error) throw new Error(error);
      return { column: filter.column, operator: filter.operator, value: filter.value };
    });
    return { filters, error: null };
  } catch (cause) {
    return {
      filters: [] as SourceFilter[],
      error: cause instanceof Error ? cause.message : "Filtres invalides.",
    };
  }
}
export const escapePattern = (value: string) => value.replaceAll(/[\\%_]/gu, "\\$&");

export function applyFilter(query: Knex.QueryBuilder, filter: SourceFilter) {
  const { column, operator, value } = filter;
  const cell = "content ->> ?";
  if (operator === "null") query.whereRaw(`${cell} is null`, [column]);
  else if (operator === "not_null") query.whereRaw(`${cell} is not null`, [column]);
  else if (operator === "empty") query.whereRaw(`${cell} = ''`, [column]);
  else if (operator === "not_empty")
    query.whereRaw(`${cell} is not null and ${cell} <> ''`, [column, column]);
  else if (operator === "eq" || operator === "neq")
    query.whereRaw(`${cell} ${operator === "eq" ? "=" : "<>"} ?`, [column, value]);
  else if (["gt", "gte", "lt", "lte"].includes(operator)) {
    const comparison = { gt: ">", gte: ">=", lt: "<", lte: "<=" }[
      operator as "gt" | "gte" | "lt" | "lte"
    ];
    query.whereRaw(
      `case when length(${cell}) <= 200 and ${cell} ~ ? then (${cell})::numeric end ${comparison} ?::numeric`,
      [column, column, numericPattern, column, value],
    );
  } else if (operator === "before" || operator === "after") {
    query.whereRaw(
      `case when ${cell} ~ '^\\d{4}-\\d{2}-\\d{2}($|[ T])' then left(${cell}, 10) end ${operator === "before" ? "<" : ">"} ?`,
      [column, column, value],
    );
  } else {
    const escaped = escapePattern(value);
    const pattern =
      operator === "starts" ? `${escaped}%` : operator === "ends" ? `%${escaped}` : `%${escaped}%`;
    query.whereRaw(`${cell} ${operator === "not_contains" ? "not ilike" : "ilike"} ?`, [
      column,
      pattern,
    ]);
  }
}
