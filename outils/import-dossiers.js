/**
 * Script d'automatisation pour importer des dossiers dans Pitchou 
 * à partir d'un fichier .ods
 * 
 * ### Utilisation
 * ```bash
 * node outils/import-dossiers.js --fichier /chemin/vers/fichier.ods \
 *   --email adresse@mail.com \
 *   --mail-demarche-numerique clemence.fernandez@beta.gouv.fr \
 *   --mdp-demarche-numerique 'motDePasseDN' \
 *   --lien-connexion-demarche-numerique 'https://demarche.numerique.gouv.fr/connexion-par-jeton/...' \
 *   --prenom-deposant 'Clémence' \
 *   --nom-deposant 'Fernandez'
 * ```
 * 
 * ### Options
 * - `--fichier, -f` : Chemin vers le fichier tableau de suivi (.ods) - **requis**
 * - `--email, -e` : Email utilisé pour récupérer le lien de connexion - **requis**
 * - `--mail-demarche-numerique` : Email du compte Démarches Numériques - **requis**
 * - `--mdp-demarche-numerique` : Mot de passe du compte Démarches Numériques - **requis**
 * - `--lien-connexion-demarche-numerique` : Lien de connexion Démarches Numériques - **requis**
 * - `--prenom-deposant` : Prénom du déposant du dossier - **requis**
 * - `--nom-deposant` : Nom du déposant du dossier - **requis**
 * ```
 */


import { firefox } from 'playwright';
import { execSync } from 'node:child_process';
import parseArgs from 'minimist';

const BASE_URL = 'http://127.0.0.1:2648';

const args = parseArgs(process.argv);
const cheminDuDocTableauDeSuivi = args.fichier || args.f;
const email = args.email || args.e;

// Paramètres obligatoires passés en arguments CLI (aucune valeur par défaut)
const mailDémarcheNumérique = args['mail-demarche-numerique'];
const mdpDémarcheNumérique = args['mdp-demarche-numerique'];
const lienDeConnexionDémarcheNumérique = args['lien-connexion-demarche-numerique'];
const prénomDuDéposant = args['prenom-deposant'];
const nomDuDéposant = args['nom-deposant'];

const paramètresManquants = [];

if (!cheminDuDocTableauDeSuivi) {
    paramètresManquants.push('--fichier / -f (chemin vers le fichier .ods)');
}
if (!email) {
    paramètresManquants.push('--email / -e (email pour récupérer le lien de connexion Pitchou)');
}
if (!mailDémarcheNumérique) {
    paramètresManquants.push('--mail-demarche-numerique (email du compte Démarches Numériques)');
}
if (!mdpDémarcheNumérique) {
    paramètresManquants.push('--mdp-demarche-numerique (mot de passe du compte Démarches Numériques)');
}
if (!lienDeConnexionDémarcheNumérique) {
    paramètresManquants.push('--lien-connexion-demarche-numerique (lien de connexion Démarches Numériques)');
}
if (!prénomDuDéposant) {
    paramètresManquants.push('--prenom-deposant (prénom du déposant du dossier)');
}
if (!nomDuDéposant) {
    paramètresManquants.push('--nom-deposant (nom du déposant du dossier)');
}

if (paramètresManquants.length > 0) {
    console.error(`
Usage: node outils/import-dossiers.js [options]

Options:
  --fichier, -f                        Chemin vers le fichier tableau de suivi (.ods) - requis
  --email, -e                          Email pour récupérer le lien de connexion - requis
  --mail-demarche-numerique            Email du compte Démarches Numériques - requis
  --mdp-demarche-numerique             Mot de passe du compte Démarches Numériques - requis
  --lien-connexion-demarche-numerique  Lien de connexion Démarches Numériques - requis
  --prenom-deposant                    Prénom du déposant du dossier - requis
  --nom-deposant                       Nom du déposant du dossier - requis

Les paramètres suivants sont manquants :
  - ${paramètresManquants.join('\n  - ')}
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
        // storageState: {
        //     cookies:{
// TODO: peut-être l'utiliser à la place du Lien de connexion ?
        //     }
        // }
    });

    const page = await context.newPage();

    console.log('Pouvoir se connecter à Démarche Numérique...')
    await page.goto(lienDeConnexionDémarcheNumérique)
    await page.getByRole('textbox', {name: 'Adresse électronique obligatoire Exemple : adresse@mail.com'}).fill(mailDémarcheNumérique);
    await page.getByRole('textbox', {name: 'Mot de passe obligatoire'}).fill(mdpDémarcheNumérique);
    await page.getByRole('button', { name : "Se connecter" }).click();
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
    console.log(`Nombre de dossiers sans alertes trouvés : ${count}`);
    const lignesDossier = await page.locator('tbody > tr').all()
    console.log(`Nombre de dossiers à importer sur la première page : ${lignesDossier.length}.`)

    // Déposer le premier dossier
    const premièreLigneDossier = lignesDossier[0]
    const locatorDeToutesLesCellules = premièreLigneDossier.locator('td')
    const locatorsCellules = await locatorDeToutesLesCellules.all()

    const nomDuProjet = await locatorsCellules[0].innerText() // la première colonne d'indice 0 correspond au Nom du projet

    console.log(`Commencement du processus de dépôt du dossier ${nomDuProjet}...`)
    const boutonPréRemplissage = locatorDeToutesLesCellules.getByRole('button', { name: 'Préparer préremplissage' })
    await boutonPréRemplissage.click()

    const boutonCréerDossier = locatorDeToutesLesCellules.getByRole('link', { name: 'Créer dossier'})
    const pageDémarcheNumériquePromise = context.waitForEvent('page');
    await boutonCréerDossier.click()
    const pageDémarcheNumérique = await pageDémarcheNumériquePromise;
  
    // Ici, on est dans Démarche Numérique
    await pageDémarcheNumérique.getByRole('link', { name : "Poursuivre mon dossier prérempli" }).click();

    // Complétez l’identité du déposant du dossier pour poursuivre.
    await pageDémarcheNumérique.getByRole('textbox', {name: 'Prénom obligatoire'}).fill(prénomDuDéposant);
    await pageDémarcheNumérique.getByRole('textbox', {name: 'Nom obligatoire', exact: true}).fill(nomDuDéposant);

    await pageDémarcheNumérique.getByRole('button', { name : "Continuer" }).click();

    // Remplir et déposer le dossier
    //TODO: générer et rajouter le fichier espèce impactée s'il existe
    await pageDémarcheNumérique.getByRole('button', { name : "Déposer le dossier" }).click();

    //TODO : faire en sorte d'importer tous les dossiers de la première page.

    console.log(`Fin du script d'automatisation`);
    
} catch (error) {
    console.error('Erreur lors de l\'automatisation :', error);
    process.exit(1);
} finally {
    await browser.close();
}


