import { applyUpPrescriptionCommentsPart1 } from "./up-prescription-comments-1.ts";

import type { Knex } from "knex";

export function applyUpPrescriptionComments(table: Knex.AlterTableBuilder) {
  applyUpPrescriptionCommentsPart1(table);
}
