import { test, expect } from '@playwright/test';

test('se connecter à Pitchou', async ({ page, baseURL }) => {
  const email = "clemence.fernandez@beta.gouv.fr";
  
  const { créerPersonneOuMettreÀJourCodeAccès } = await import('../../scripts/server/database/personne.js');
  const codeAccès = await créerPersonneOuMettreÀJourCodeAccès(email);
  const lienConnexion = `${baseURL}?secret=${codeAccès}`;

  await page.goto(lienConnexion);

  await expect(page.getByRole('heading', { level: 1})).toContainText('Tableau de suivi instruction DDEP');
});


