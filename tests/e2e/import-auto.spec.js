import { test, expect } from '@playwright/test';

const monCheminnDuDocTableauDeSuivi = '/Users/clemencefernandez/Desktop/pitchou/tests/e2e/24-2B_TDB_DOSSIERS_DEP.ods'
const monLienDeConnexionPitchou = 'http://127.0.0.1:2648/?secret=6fa0acklkdk'

test.use({baseURL: 'http://127.0.0.1:2648'})

test(`Outil import automatisé`, async ({ page, }) => {
    // Se connecter à Pitchou avec le lien de connexion
    await page.goto(monLienDeConnexionPitchou);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tableau de suivi');


    // Se rendre sur la page des imports
    await page.goto('/import-dossier-historique/corse');
    // Charger le tableau de suivi
    await page.locator('input[type="file"]').setInputFiles(monCheminnDuDocTableauDeSuivi);
    // Attendre que le tableau s'affiche bien
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Dossiers restants à importer');

    await expect(page.getByRole('table')).toBeVisible();

    // Récupérer les lignes des dossiers sans alerte
    // Pour pouvoir lancer des imports autos sur tous les dossiers sans alertes.
    const dossiersSansAlertes = page.getByTestId('dossier-sans-alerte(s)',)
    await expect(dossiersSansAlertes).toHaveCount(18, {timeout: 5000})

});