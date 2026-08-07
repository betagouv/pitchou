import { applyUpControleCommentsPart1 } from "./up-controle-comments-1.ts";

import type { Knex } from "knex";

export function applyUpControleComments(table: Knex.AlterTableBuilder) {
  applyUpControleCommentsPart1(table);
}
