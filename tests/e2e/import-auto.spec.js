import { test, expect } from '@playwright/test';
const monLienDeConnexionPitchou = 'http://127.0.0.1:2648/?secret=6fa0acklkdk'



test(`Outil import automatisé`, async ({ page }) => {
    // Se connecter à Pitchou avec le lien de connexion
    await page.goto(monLienDeConnexionPitchou);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tableau de suivi');


    // Se rendre sur la page des imports
    await page.goto('/import-dossier-historique/corse');
    // Charger le tableau de suivi
    await page.locator('input[type="file"]').setInputFiles('/Users/clemencefernandez/Desktop/pitchou/tests/e2e/24-2B_TDB_DOSSIERS_DEP.ods');
    // Attendre que le tableau s'affiche bien
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Dossiers restants à importer', {timeout: 5000});

    // Récupérer les lignes des dossiers sans alerte
    // Pour pouvoir lancer des imports autos sur tous les dossiers sans alertes.
    //@ts-ignore
    const dossiersSansAlertes = page.getByTestId('dossier-sans-alerte(s)')

});
