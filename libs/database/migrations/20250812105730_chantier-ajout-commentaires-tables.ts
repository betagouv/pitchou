import type { Knex } from "knex";

import { applyUpDossierComments } from "./20250812105730-comments/up-dossier-comments.ts";
import { applyUpControleComments } from "./20250812105730-comments/up-controle-comments.ts";
import { applyUpPersonneComments } from "./20250812105730-comments/up-personne-comments.ts";
import { applyUpDecisionAdministrativeComments } from "./20250812105730-comments/up-decision-administrative-comments.ts";
import { applyUpPrescriptionComments } from "./20250812105730-comments/up-prescription-comments.ts";
import { applyDownDossierComments } from "./20250812105730-comments/down-dossier-comments.ts";
import { applyDownControleComments } from "./20250812105730-comments/down-controle-comments.ts";
import { applyDownPersonneComments } from "./20250812105730-comments/down-personne-comments.ts";
import { applyDownDecisionAdministrativeComments } from "./20250812105730-comments/down-decision-administrative-comments.ts";
import { applyDownPrescriptionComments } from "./20250812105730-comments/down-prescription-comments.ts";

export function up(knex: Knex) {
  return knex.schema
    .alterTable("dossier", applyUpDossierComments)
    .then(() => knex.schema.alterTable("contrôle", applyUpControleComments))
    .then(() => knex.schema.alterTable("personne", applyUpPersonneComments))
    .then(() =>
      knex.schema.alterTable("décision_administrative", applyUpDecisionAdministrativeComments),
    )
    .then(() => knex.schema.alterTable("prescription", applyUpPrescriptionComments));
}

export function down(knex: Knex) {
  return knex.schema
    .alterTable("dossier", applyDownDossierComments)
    .then(() => knex.schema.alterTable("contrôle", applyDownControleComments))
    .then(() => knex.schema.alterTable("personne", applyDownPersonneComments))
    .then(() =>
      knex.schema.alterTable("décision_administrative", applyDownDecisionAdministrativeComments),
    )
    .then(() => knex.schema.alterTable("prescription", applyDownPrescriptionComments));
}
