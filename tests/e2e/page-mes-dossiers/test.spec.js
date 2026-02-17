import { test, expect } from '@playwright/test';
import beforeAll from '../before-all';

test.beforeAll(async () => {
    await beforeAll('page-mes-dossiers/données.sql')
});

test.beforeEach(async ( { page } ) => {
    await page.goto('/?secret=abyssin');
    await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
    await page.goto('/mes-dossiers');
    await expect(page.getByRole('heading', { level: 1})).toContainText('Mes dossiers');
})



test.describe('Page Mes dossiers', () => {
    test(`Je peux voir tous les dossiers que je suis, et les dossiers selon le tri suivant :
            - D'abord par leur date de notification si la notification n'a pas été consultée, de la plus récente à la plus ancienne
            - Puis par date date_dépôt, de la plus récente à la plus ancienne.`, async ( { page } ) => {
        await expect(page.getByLabel('compteur de dossier')).toContainText('4/4 dossiers')

        const cartesDossier = await page.getByTestId('carte-dossier').all()
        const ordreIdDossier = [2,1,4,3]

        for (let i = 0; i < cartesDossier.length; i++) {
            await expect(cartesDossier[i]).toContainText(`Dossier n°${ordreIdDossier[i]}`)
        }
            
    })

    test(`Les dossiers avec une notification non lue ont un tag Nouveauté.`, async ( { page } ) => {;
        const dossiersAvecNotificationNonVue = await page.getByTestId('carte-dossier')
            .filter({
                has: page.locator('p.fr-badge', { hasText: /Nouveauté/i })
            })
            .all();

        expect(dossiersAvecNotificationNonVue).toHaveLength(2)
    })

    test(`Quand j'appuie sur Nouveauté, je ne vois que les dossiers qui possèdent une notification non vue.`, async ( { page } ) => {
        await page.getByRole('button', { name: 'Nouveauté'}).click()

        await expect(page.getByLabel('compteur de dossier')).toContainText('2/4 dossiers')

        const cartesDossier = await page.getByTestId('carte-dossier').all()
        const ordreIdDossier = [2,1]

        for (let i = 0; i < cartesDossier.length; i++) {
            await expect(cartesDossier[i]).toContainText(`Dossier n°${ordreIdDossier[i]}`)
        }

    })

    test(`Quand je consulte un dossier et que je reviens sur la page Mes dossiers, le tag Nouveauté disparaît. `, async ( { page } ) => {
        // Je clique sur le lien du premier dossier
        const titrePremierDossier = page.getByRole('link', { name: 'Recherche scientifique sur' })
        await expect(titrePremierDossier).toBeVisible()
        await titrePremierDossier.click()

        // Cela m'amène sur la page du dossier
        await expect(page.getByRole('heading', { level: 1})).toContainText('Dossier n°2 : Recherche scientifique sur les chats');
        
        // Je reviens sur la page mes dossiers
        await page.goto('/mes-dossiers');
        await expect(page.getByRole('heading', { level: 1})).toContainText('Mes dossiers');
        // Je ne dois plus voir de tag Nouveauté sur le premier dossier


const premierDossier = page
  .getByTestId('carte-dossier')
  .filter({
    has: titrePremierDossier
  });

await expect(premierDossier).toHaveCount(1);
const badge = premierDossier.locator('p.fr-badge', {
  hasText: /Nouveauté/i
});

await expect(badge).toHaveCount(0);

    })



});
