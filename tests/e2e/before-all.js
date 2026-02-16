import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

/**
 * 
 * @param {string} cheminRelatifDonnéesSQL // Chemin du fichier SQL avec les données spécifiques au test (ex : /tests/exemple/données.sql)
 */
export default async function (cheminRelatifDonnéesSQL) {
    // Supprimer la base de données existante
    await exec(`docker exec pitchou-test_db-1 dropdb -f --username=dev especes_pro_3731`)

    // Recréer la base de données
    await exec(`docker exec pitchou-test_db-1 createdb --username=dev especes_pro_3731`)

    // Exécuter les migrations communes à tous les tests
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /docker-entrypoint-initdb.d/01-schema.sql`)
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /docker-entrypoint-initdb.d/02-knex.sql`)

    // Exécuter les migrations spécifiques à ce test
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /tests/${cheminRelatifDonnéesSQL}`)
    // Afficher le contenu de la table notification
    // const { stdout } = await exec(`docker exec pitchou-test_db-1 psql --username=dev --tuples-only --no-align --dbname=especes_pro_3731 -c "SELECT * FROM notification;"`);
    // console.log('Contenu de notification :\n', stdout);
}