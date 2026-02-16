import { test, expect } from '@playwright/test';
import beforeAll from '../before-all';

test.beforeAll(async () => {
    await beforeAll('page-mes-dossiers/données.sql')
});

test.beforeEach(() => console.log('coucou'))



test.describe('Page Mes dossiers', () => {
    test(`J'ai accès à la page "Mes dossiers" à partir de la page d'accueil`, async ({ page }) => {
        await page.goto('/?secret=abyssin');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');

        await expect(page.getByRole('heading', { name: '/5 dossiers sélectionnés', level: 2 })).toContainText('5/5 dossiers sélectionnés')
        
        await page.getByRole('link', { name: 'Mes dossiers Nouveau' }).click()

        await expect(page.getByRole('heading', { level: 1})).toContainText('Mes dossiers');

        await expect(page.getByLabel('compteur de dossier')).toContainText('4/4 dossiers')
    });

    test(`Je peux voir tous les dossiers que je suis, et les dossiers selon le tri suivant :
            - D'abord par leur date de notification si la notification n'a pas été consultée, de la plus récente à la plus ancienne
            - Puis par date date_dépôt, de la plus récente à la plus ancienne `, async ( { page } ) => {
        //TODO: comment éviter de répéter ces lignes ? avec le before each ?
        await page.goto('/?secret=abyssin');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
        await page.goto('/mes-dossiers');

        await expect(page.getByRole('heading', { level: 1})).toContainText('Mes dossiers');
    }  
    )

    // TODO: Je peux voir tous les dossiers que je suis et les dossiers selon le tri suivant :
    // - D'abord par leur date de notification si la notification n'a pas été consultée, de la plus récente à la plus ancienne
    // - Puis par date date_dépôt, de la plus récente à la plus ancienne

    // TODO: les dossiers avec une notification non lue ont un tag Nouveauté

    // TODO: Quand j'appuie sur Nouveauté, je ne vois que les dossiers qui possèdent une notification non vue.

    // TODO: Quand je consulte un dossier et que je reviens sur la page Mes dossiers, le tag nouveauté disparaît. 

});
