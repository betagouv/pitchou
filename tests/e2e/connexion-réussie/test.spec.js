import { test, expect } from '@playwright/test';
import beforeAll from '../before-all';

test.beforeAll(async () => {
    await beforeAll('connexion-réussie/données.sql')
});


test.describe('Connexion réussie', () => {
    test(`Le code d'accès est valide`, async ({ page }) => {
        await page.goto('/?secret=abyssin');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
    });

});
