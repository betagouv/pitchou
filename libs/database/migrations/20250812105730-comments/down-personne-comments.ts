import { applyDownPersonneCommentsPart1 } from "./down-personne-comments-1.ts";

import type { Knex } from "knex";

export function applyDownPersonneComments(table: Knex.AlterTableBuilder) {
  applyDownPersonneCommentsPart1(table);
}
