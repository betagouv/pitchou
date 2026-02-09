import { test, expect } from '@playwright/test';
import beforeAll from '../before-all';

test.beforeAll(async () => {
    await beforeAll('connexion-réussie/données.sql')
});


test.describe('Connexion réussie', () => {
    test(`Le code d'accès est valide`, async ({ page }) => {
        await page.goto('/?secret=abyssin');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');

        await expect(page.getByRole('heading', { name: '/1 dossiers sélectionnés', level: 2 })).toContainText('1/1 dossiers sélectionnés')
        await expect(page.locator('div.fr-table > table')).toBeVisible()
        await expect(page.locator('div.fr-table > table > thead')).toBeVisible()
        await expect(page.locator('div.fr-table > table > tbody > tr:first-child')).toBeVisible()
    });

});
