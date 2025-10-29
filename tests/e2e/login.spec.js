import { test, expect } from '@playwright/test';

test(`La connexion à Pitchou fonctionne et le tableau de suivi s'affiche`, async ({ page, baseURL }) => {
  const email = "clemence.fernandez@beta.gouv.fr";
  
  const { créerPersonneOuMettreÀJourCodeAccès } = await import('../../scripts/server/database/personne.js');
  const codeAccès = await créerPersonneOuMettreÀJourCodeAccès(email);
  const lienConnexion = `${baseURL}?secret=${codeAccès}`;

  await page.goto(lienConnexion);

  await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
});