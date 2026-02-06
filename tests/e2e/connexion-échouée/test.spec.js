import { test, expect } from '@playwright/test';
import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

test.beforeAll(async () => {
    // Supprimer la base de données existante
    await exec(`docker exec test_db dropdb -f --username=dev especes_pro_3731`)
    // Recréer la base de données
    await exec(`docker exec test_db createdb --username=dev especes_pro_3731`)

    // la remplir avec les bons fichiers (fichiers communs : schema, knex et le fichier de données.)
    // restart le serveur
    console.log('Before tests');
});

test.afterAll(async () => {
    //TODO: drop la base de donnée (au cas où)
  console.log('After tests');
});

test.describe('Connexion échouée', () => {
    test(`La page de connexion s'affiche`, async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('banner')).toContainText('Pitchou');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByLabel('Adresse email')).toBeVisible();
    });

    test(`Erreur: le code d'accès est invalide`, async ({ page }) => {
        await page.goto('/?secret=inexistant');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByText(`Erreur : Erreur de connexion - Votre lien de connexion n'est plus valide.`)).toBeVisible();
    });

    test(`Erreur: le compte n'est pas associé à un groupe d'intructeurice`, async ({ page }) => {
        await page.goto('/?secret=test.pas.de.groupe');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByText(`Erreur : Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs`)).toBeVisible();
    });
});
