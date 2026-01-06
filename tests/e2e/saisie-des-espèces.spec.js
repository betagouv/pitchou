import { test, expect } from '@playwright/test';

test.describe('Page Saisie des espèces', () => {
    test(`La page de Saisie des espèces s'affiche correctement`, async ({ page }) => {
        await page.goto('/saisie-especes');

        await expect(page.getByRole('banner')).toContainText('Pitchou');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Espèces protégées impactées');
        await expect(page.getByRole('button', { name: 'Pré-remplir'})).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Espèce'})).toBeVisible()
        await expect(page.getByRole('button', { name: 'Valider ma saisie'})).toBeVisible();
    });
});
