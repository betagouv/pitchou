import { applyDownDossierCommentsPart1 } from "./down-dossier-comments-1.ts";
import { applyDownDossierCommentsPart2 } from "./down-dossier-comments-2.ts";

import type { Knex } from "knex";

export function applyDownDossierComments(table: Knex.AlterTableBuilder) {
  applyDownDossierCommentsPart1(table);
  applyDownDossierCommentsPart2(table);
}
