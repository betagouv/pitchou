import { test, expect } from '@playwright/test';
import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

test.beforeAll(async () => {
    // Supprimer la base de données existante
    await exec(`docker exec pitchou-test_db-1 dropdb -f --username=dev especes_pro_3731`)

    // Recréer la base de données
    await exec(`docker exec pitchou-test_db-1 createdb --username=dev especes_pro_3731`)

    // Exécuter les migrations communes à tous les tests
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /docker-entrypoint-initdb.d/01-schema.sql`)
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /docker-entrypoint-initdb.d/02-knex.sql`)

    // Exécuter les migrations spécifiques à ce test
    await exec(`docker exec pitchou-test_db-1 psql --username=dev especes_pro_3731 -f /tests/connexion-réussie/données.sql`)
});


test.describe('Connexion réussie', () => {
    test(`Le code d'accès est valide`, async ({ page }) => {
        await page.goto('/?secret=abyssin');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
    });

});
