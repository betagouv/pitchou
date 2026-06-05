import type { Knex } from "knex";

/**
 * Le nettoyage des `fichier` orphelins suite à une suppression ou modification
 * d'`avis_expert` est désormais effectué côté application (cf. avis_expert.ts),
 * ce qui permet aussi de supprimer l'objet S3 associé via `file_id`.
 */
export async function up(knex: Knex) {
  await knex.raw(`
DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_trigger ON public.avis_expert;
DROP FUNCTION IF EXISTS supprimer_fichiers_avis_expert();

DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_orphelins_trigger ON public.avis_expert;
DROP FUNCTION IF EXISTS supprimer_fichiers_avis_expert_orphelins();
`);
}

export async function down(knex: Knex) {
  await knex.raw(`
CREATE OR REPLACE FUNCTION supprimer_fichiers_avis_expert()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS
$$
BEGIN
    DELETE FROM fichier WHERE fichier.id = OLD.avis_fichier OR fichier.id = OLD.saisine_fichier;
    return OLD;
END;
$$;

CREATE TRIGGER supprimer_fichiers_avis_expert_trigger
    AFTER DELETE
    ON "avis_expert"
    FOR EACH ROW
EXECUTE PROCEDURE supprimer_fichiers_avis_expert();
`);

  await knex.raw(`
CREATE OR REPLACE FUNCTION supprimer_fichiers_avis_expert_orphelins()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS
$$
BEGIN
    IF OLD.saisine_fichier IS NOT NULL AND OLD.saisine_fichier <> NEW.saisine_fichier THEN
        DELETE FROM fichier WHERE fichier.id = OLD.saisine_fichier;
    END IF;
    IF OLD.avis_fichier IS NOT NULL AND OLD.avis_fichier <> NEW.avis_fichier THEN
        DELETE FROM fichier WHERE fichier.id = OLD.avis_fichier;
    END IF;
    return OLD;
END;
$$;

CREATE TRIGGER supprimer_fichiers_avis_expert_orphelins_trigger
    AFTER UPDATE
    ON "avis_expert"
    FOR EACH ROW
EXECUTE PROCEDURE supprimer_fichiers_avis_expert_orphelins();
`);
}
