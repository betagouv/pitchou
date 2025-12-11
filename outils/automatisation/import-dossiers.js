/**
 * Script d'automatisation 
 * pour importer des dossiers dans Pitchou 
 * à partir d'un fichier .ods
 */

import { firefox } from 'playwright';
import { execSync } from 'node:child_process';
import parseArgs from 'minimist';

const BASE_URL = 'http://127.0.0.1:2648';

const args = parseArgs(process.argv);
const cheminDuDocTableauDeSuivi = args.fichier || args.f;
const email = args.email || args.e || 'clemence.fernandez@beta.gouv.fr';

if (!cheminDuDocTableauDeSuivi) {
    console.error(`
Usage: node outils/automatisation/import-dossiers.js [options]

Options:
  --fichier, -f    Chemin vers le fichier tableau de suivi (.ods)
  --email, -e      Email pour récupérer le lien de connexion (défaut: ${email})
`);
    process.exit(1);
}

/**
 * @param {string} emailArg
 */
function fetchSecret(emailArg) {
    try {
        const cmd = `docker exec tooling node outils/afficher-liens-de-connexion.js --emails ${emailArg}`;
        const output = execSync(cmd, { encoding: 'utf-8' });
        const match = output.match(/secret=([A-Za-z0-9_-]+)/);
        if (match && match[1]) {
            return match[1];
        }
        throw new Error(`Secret introuvable dans la sortie : ${output}`);
    } catch (err) {
        console.error('Erreur lors de la récupération du secret via docker exec:', err);
        process.exit(1);
    }
}

const secret = fetchSecret(email);
const urlComplète = `${BASE_URL}?secret=${secret}`;

console.log('Démarrage de l\'automatisation d\'import...');
console.log(`- Fichier: ${cheminDuDocTableauDeSuivi}`);
console.log(`- URL: ${urlComplète}`);
console.log(`- Secret généré: ${secret}`);

const browser = await firefox.launch({
    headless: false,
});

try {
    const context = await browser.newContext({
        locale: 'fr',
    });

    const page = await context.newPage();

    console.log('Connexion à Pitchou...');
    await page.goto(urlComplète);

    const headingLocator = page.getByRole('heading', { level: 1 })
    const heading = await headingLocator.textContent();
    console.log(`✅ Connecté - Page: ${heading}`);

    // Navigation vers la page d'import
    await page.goto(`${BASE_URL}/import-dossier-historique/corse`);
    
    // Chargement du tableau
    await page.locator('input[type="file"]').setInputFiles(cheminDuDocTableauDeSuivi);
    
    await page.waitForSelector('h2', { timeout: 10000 });
    await page.waitForSelector('table', { timeout: 10000 });

    // Récupération des dossiers sans alertes
    const dossiersSansAlertes = page.getByTestId('dossier-sans-alerte(s)');
    const count = await dossiersSansAlertes.count();
    console.log(`Nombre de dossiers sans alertes trouvés: ${count}`);

    console.log(`Fin du script d'automatisation`);
    
} catch (error) {
    console.error('Erreur lors de l\'automatisation :', error);
    process.exit(1);
} finally {
    await browser.close();
}


