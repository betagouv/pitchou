import {
  GROUP_PREVIEW_PAGE_SIZE,
  type GroupPreview,
  type GroupRule,
  type PreviewCategory,
} from "@pitchou/types/groupRouting.ts";
import type { Knex } from "knex";
import { ruleMatchesSql } from "../../../dossierRouting/sql.ts";
import type { GroupUpdate } from "../../groups.ts";
import type { PreviewPageRequest } from "./pagination.ts";

type CategoryResult = {
  category: PreviewCategory;
  count: string;
  dossiers: GroupPreview[PreviewCategory]["dossiers"];
  digest: string;
};

export async function queryPreview(
  trx: Knex.Transaction,
  input: GroupUpdate,
  rules: GroupRule[],
  page?: PreviewPageRequest,
): Promise<CategoryResult[]> {
  const { rows } = await trx.raw(
    `WITH assignments AS MATERIALIZED (
      SELECT d.id, d.name, e.access_level AS before_level,
        CASE WHEN ?::boolean THEN NULLIF(COALESCE(
          CASE WHEN o.mode = 'include' THEN o.access_level
            WHEN o.mode = 'exclude' THEN 'none' END,
          (SELECT CASE WHEN bool_or(r."accessLevel" = 'instruct') THEN 'instruct' ELSE 'read' END
            FROM jsonb_to_recordset(?::jsonb)
              AS r(departments text[], communes text[], activites text[], "accessLevel" text)
            WHERE ${ruleMatchesSql()}
            HAVING count(*) > 0)
        ), 'none') END AS after_level
      FROM dossier d
      LEFT JOIN edge_groupe_instructeurs__dossier e
        ON e.dossier = d.id AND e.groupe_instructeurs = ?::uuid
      LEFT JOIN dossier_group_override o
        ON o.dossier = d.id AND o.groupe_instructeurs = ?::uuid
    ), categorized AS MATERIALIZED (
      SELECT *, CASE
        WHEN before_level IS NULL AND after_level IS NOT NULL THEN 'added'
        WHEN before_level IS NOT NULL AND after_level IS NULL THEN 'removed'
        WHEN before_level = 'read' AND after_level = 'instruct' THEN 'upgraded'
        WHEN before_level = 'instruct' AND after_level = 'read' THEN 'downgraded'
      END AS category
      FROM assignments WHERE before_level IS NOT NULL OR after_level IS NOT NULL
    ), snapshot AS (
      SELECT encode(sha256(convert_to(COALESCE(string_agg(
        encode(sha256(convert_to(jsonb_build_array(id, name, before_level, after_level)::text,
          'UTF8')), 'hex'), '' ORDER BY id), ''), 'UTF8')), 'hex') AS digest
      FROM categorized
    ), totals AS (
      SELECT categories.category, count(c.id) AS count
      FROM (VALUES ('added'), ('removed'), ('upgraded'), ('downgraded')) categories(category)
      LEFT JOIN categorized c ON c.category = categories.category
      GROUP BY categories.category
    )
    SELECT t.category, t.count, snapshot.digest,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.id)
        FROM (SELECT c.id, c.name FROM categorized c
          WHERE c.category = t.category AND (?::text IS NULL OR t.category = ?::text)
          ORDER BY c.id LIMIT ? OFFSET CASE WHEN ?::bigint < t.count THEN ?::bigint ELSE 0 END
        ) p), '[]'::jsonb) AS dossiers
    FROM totals t CROSS JOIN snapshot`,
    [
      input.active,
      JSON.stringify(
        rules.map((rule) => ({ ...rule, accessLevel: rule.accessLevel ?? "instruct" })),
      ),
      input.id ?? null,
      input.id ?? null,
      page?.category ?? null,
      page?.category ?? null,
      GROUP_PREVIEW_PAGE_SIZE,
      ((page?.page ?? 1) - 1) * GROUP_PREVIEW_PAGE_SIZE,
      ((page?.page ?? 1) - 1) * GROUP_PREVIEW_PAGE_SIZE,
    ],
  );
  return rows;
}
