import { test } from '@playwright/test';

const monMail = 'à remplir'
const monMotdePasse = 'à remplir'
const lienPréremplissage = 'à remplir'
const lienDémarchesSimplifiéesavecToken = 'à remplir'

test(`Outil import automatisé`, async ({ page }) => {

  // Se connecter à Démarches Simplifiées
  await page.goto(lienDémarchesSimplifiéesavecToken)

  await page.getByRole('textbox', {name: 'Adresse électronique obligatoire Exemple : adresse@mail.com'}).fill(monMail);

  await page.getByRole('textbox', {name: 'Mot de passe obligatoire'}).fill(monMotdePasse);

  await page.getByRole('button', { name : "Se connecter" }).click();

  //TO DO: Récupérer le lien de pré-remplissage

  // Accéder à la page avec le lien de pré-remplissage
  await page.goto(lienPréremplissage);
  await page.getByRole('link', { name : "Poursuivre mon dossier prérempli" }).click();

  // Page Complétez l’identité du déposant du dossier pour poursuivre.
  await page.getByRole('textbox', {name: 'Prénom obligatoire'}).fill('Clémence');
  await page.getByRole('textbox', {name: 'Nom obligatoire', exact: true}).fill('Fernandez');

  await page.getByRole('button', { name : "Continuer" }).click();

  // Page Dossier n° XXX - En brouillon depuis le XXX
  await page.getByRole('button', { name : "Déposer le dossier" }).click();

  // TODO: Lancer l'outil de synchro
  // TODO: Vérifier que le dossier est bien importé

});