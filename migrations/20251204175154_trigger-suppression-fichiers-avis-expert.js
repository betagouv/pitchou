/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
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

DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_trigger on public.avis_expert;

CREATE TRIGGER supprimer_fichiers_avis_expert_trigger
	AFTER DELETE
	ON "avis_expert"
	FOR EACH ROW
EXECUTE PROCEDURE supprimer_fichiers_avis_expert();
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.raw(`
DROP TRIGGER IF EXISTS supprimer_fichiers_avis_expert_trigger 
ON public.avis_expert;

DROP FUNCTION IF EXISTS supprimer_fichiers_avis_expert();
`)
} 