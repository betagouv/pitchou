import { test, expect } from '@playwright/test';
import beforeAll from '../before-all';

test.beforeAll(async () => {
    await beforeAll('page-mes-dossiers/données.sql')
});


test.describe('Page Mes dossiers', () => {
    test(`J'ai accès à la page "Mes dossiers"`, async ({ page }) => {
        await page.goto('/?secret=abyssin');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');

        await expect(page.getByRole('heading', { name: '/1 dossiers sélectionnés', level: 2 })).toContainText('1/1 dossiers sélectionnés')
        
        await page.getByRole('link', { name: 'Mes dossiers Nouveau' }).click()

        await expect(page.getByRole('heading', { level: 1})).toContainText('Mes dossiers');
    });

    // TODO: Je vois tous les dossiers que je suis

    // TODO: Quand j'appuie sur Nouveauté, je ne vois que les dossiers avec des nouveautés

    // TODO: Quand je consulte un dossier et que je reviens sur la page Mes dossiers, le tag nouveauté disparaît. 

});
