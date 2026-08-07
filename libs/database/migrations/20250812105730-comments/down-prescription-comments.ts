import { applyDownPrescriptionCommentsPart1 } from "./down-prescription-comments-1.ts";

import type { Knex } from "knex";

export function applyDownPrescriptionComments(table: Knex.AlterTableBuilder) {
  applyDownPrescriptionCommentsPart1(table);
}
