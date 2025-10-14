import { test, expect } from '@playwright/test';

test.describe.serial('Premier test basic', () => {
    test(`La page de connexion s'affiche`, async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('banner')).toContainText('Pitchou');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Connexion');
        await expect(page.getByLabel('Adresse email')).toBeVisible();
    });
});
