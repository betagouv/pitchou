import { applyDownDecisionAdministrativeCommentsPart1 } from "./down-decision-administrative-comments-1.ts";

import type { Knex } from "knex";

export function applyDownDecisionAdministrativeComments(table: Knex.AlterTableBuilder) {
  applyDownDecisionAdministrativeCommentsPart1(table);
}
