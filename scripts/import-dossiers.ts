/**
 * Automation script to import dossiers into Pitchou
 * from a .ods file
 *
 * ### Usage
 * ```bash
 * node outils/import-dossiers.js --fichier /chemin/vers/fichier.ods
 * ```
 *
 * ### Options
 * - `--fichier, -f`: Path to the tracking table file (.ods) - **required**
 * - `--email, -e`: Email used to retrieve the login link
 *   (default: `clemence.fernandez@beta.gouv.fr`)
 *
 * ### Behavior
 * - Fixed URL: `http://127.0.0.1:2648`
 * - Secret retrieved automatically via
 *   `docker exec tooling node outils/afficher-liens-de-connexion.js --emails <email>`
 * - Launch of the Firefox browser provided by Playwright (Nightly equivalent)
 *
 * ### Example
 * ```bash
 * node outils/import-dossiers.js \
 *   --fichier /Users/clemencefernandez/Desktop/pitchou_pas_code/import_corse/24-2B_TDB_DOSSIERS_DEP.ods \
 *   --email clemence.fernandez@beta.gouv.fr
 * ```
 */

import { firefox } from "@playwright/test";
import { execSync } from "node:child_process";
import parseArgs from "minimist";

const BASE_URL = "http://127.0.0.1:2648";

const args = parseArgs(process.argv);
const cheminDuDocTableauDeSuivi = args.fichier || args.f;
const email = args.email || args.e || "clemence.fernandez@beta.gouv.fr";

if (!cheminDuDocTableauDeSuivi) {
  console.error(`
Usage: node outils/import-dossiers.js [options]

Options:
  --fichier, -f    Chemin vers le fichier tableau de suivi (.ods)
  --email, -e      Email pour récupérer le lien de connexion (défaut: ${email})
`);
  process.exit(1);
}

function fetchSecret(emailArg: string) {
  try {
    const cmd = `docker exec tooling node outils/afficher-liens-de-connexion.js --emails ${emailArg}`;
    const output = execSync(cmd, { encoding: "utf-8" });
    const match = output.match(/secret=([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error(`Secret introuvable dans la sortie : ${output}`);
  } catch (err) {
    console.error("Erreur lors de la récupération du secret via docker exec:", err);
    process.exit(1);
  }
}

const secret = fetchSecret(email);
const urlComplete = `${BASE_URL}?secret=${secret}`;

console.log("Démarrage de l'automatisation d'import...");
console.log(`- Fichier: ${cheminDuDocTableauDeSuivi}`);
console.log(`- URL: ${urlComplete}`);
console.log(`- Secret généré: ${secret}`);

const browser = await firefox.launch({
  headless: false,
});

try {
  const context = await browser.newContext({
    locale: "fr",
  });

  const page = await context.newPage();

  console.log("Connexion à Pitchou...");
  await page.goto(urlComplete);

  const headingLocator = page.getByRole("heading", { level: 1 });
  const heading = await headingLocator.textContent();
  console.log(`✅ Connecté - Page: ${heading}`);

  // Navigate to the import page
  await page.goto(`${BASE_URL}/import-dossier-historique/corse`);

  // Load the table
  await page.locator('input[type="file"]').setInputFiles(cheminDuDocTableauDeSuivi);

  await page.waitForSelector("h2", { timeout: 10000 });
  await page.waitForSelector("table", { timeout: 10000 });

  // Retrieve the dossiers without alerts
  const dossiersSansAlertes = page.getByTestId("dossier-sans-alerte(s)");
  const count = await dossiersSansAlertes.count();
  console.log(`Nombre de dossiers sans alertes trouvés: ${count}`);

  console.log(`Fin du script d'automatisation`);
} catch (error) {
  console.error("Erreur lors de l'automatisation :", error);
  process.exit(1);
} finally {
  await browser.close();
}
