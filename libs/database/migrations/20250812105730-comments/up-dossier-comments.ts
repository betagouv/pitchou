import { applyUpDossierCommentsPart1 } from "./up-dossier-comments-1.ts";
import { applyUpDossierCommentsPart2 } from "./up-dossier-comments-2.ts";

import type { Knex } from "knex";

export function applyUpDossierComments(table: Knex.AlterTableBuilder) {
  applyUpDossierCommentsPart1(table);
  applyUpDossierCommentsPart2(table);
}
