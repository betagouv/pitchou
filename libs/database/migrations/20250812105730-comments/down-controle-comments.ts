import { applyDownControleCommentsPart1 } from "./down-controle-comments-1.ts";

import type { Knex } from "knex";

export function applyDownControleComments(table: Knex.AlterTableBuilder) {
  applyDownControleCommentsPart1(table);
}
