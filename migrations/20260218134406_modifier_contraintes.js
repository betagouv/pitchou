/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.raw(`
        alter table "avis_expert" drop constraint avis_expert_dossier_foreign;
        alter table "décision_administrative" drop constraint décision_administrative_dossier_foreign;
        alter table "arête_dossier__fichier_pièces_jointes_pétitionnaire" drop constraint arête_dossier__fichier_pièces_jointes_pétitionnaire_dossier_;

        alter table "avis_expert" add constraint "avis_expert_dossier_foreign" foreign key (dossier) references dossier(id) on delete restrict;
        alter table "arête_dossier__fichier_pièces_jointes_pétitionnaire" add constraint "arête_dossier__fichier_pièces_jointes_pétitionnaire_dossier_" foreign key (dossier) references dossier(id) on delete restrict;
        alter table "décision_administrative" add constraint "décision_administrative_dossier_foreign" foreign key (dossier) references dossier(id) on delete restrict;
    `)
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.raw(`
        alter table "avis_expert" drop constraint avis_expert_dossier_foreign;
        alter table "décision_administrative" drop constraint décision_administrative_dossier_foreign;
        alter table "arête_dossier__fichier_pièces_jointes_pétitionnaire" drop constraint arête_dossier__fichier_pièces_jointes_pétitionnaire_dossier_;

        alter table "avis_expert" add constraint "avis_expert_dossier_foreign" foreign key (dossier) references dossier(id) on delete cascade;
        alter table "arête_dossier__fichier_pièces_jointes_pétitionnaire" add constraint "arête_dossier__fichier_pièces_jointes_pétitionnaire_dossier_" foreign key (dossier) references dossier(id) on delete cascade;
        alter table "décision_administrative" add constraint "décision_administrative_dossier_foreign" foreign key (dossier) references dossier(id) on delete cascade;
    `)
}
