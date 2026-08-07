import { applyUpPersonneCommentsPart1 } from "./up-personne-comments-1.ts";

import type { Knex } from "knex";

export function applyUpPersonneComments(table: Knex.AlterTableBuilder) {
  applyUpPersonneCommentsPart1(table);
}
