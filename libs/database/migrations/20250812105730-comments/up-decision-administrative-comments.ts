import { applyUpDecisionAdministrativeCommentsPart1 } from "./up-decision-administrative-comments-1.ts";

import type { Knex } from "knex";

export function applyUpDecisionAdministrativeComments(table: Knex.AlterTableBuilder) {
  applyUpDecisionAdministrativeCommentsPart1(table);
}
