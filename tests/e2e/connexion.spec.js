import { test, expect } from '@playwright/test';

test.describe.serial('Connexion', () => {
    test(`La page de connexion s'affiche`, async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('banner')).toContainText('Pitchou');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByLabel('Adresse email')).toBeVisible();
    });

    test(`Erreur: le code d'accès est invalide`, async ({ page }) => {
        await page.goto('/?secret=innexistant');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByText(`Erreur : Erreur de connexion - Votre lien de connexion n'est plus valide.`)).toBeVisible();
    });

    test(`Erreur: le compte n'est pas associé à un groupe d'intructueurice`, async ({ page }) => {
        await page.goto('/?secret=test.pas.de.groupe');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByText(`Erreur : Il semblerait que vous ne fassiez partie d'aucun groupe instructeurs`)).toBeVisible();
    });
});
