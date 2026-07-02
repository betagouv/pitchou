import { test, expect } from "../fixtures/playwright.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

test("l'entête affiche le porteur de projet personne morale (représentant + SIRET)", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@porteur-morale.fr",
    dossierNom: "Dossier porteur personne morale e2e",
    porteurDeProjet: {
      type: "personne morale",
      siret: "88800620200020",
      adresse: "12 rue des Landes\n29190 Brasparts",
      nom_representant: "MARTIN",
      prenom_representant: "Claire",
      qualite_representant: "Directrice de projet",
      telephone: "02 98 00 00 01",
      email: "claire.martin@echappee-belle.fr",
    },
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await expect(page.getByText("Personne qui porte le projet")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Claire MARTIN (SIRET 88800620200020)" }),
  ).toHaveAttribute("href", "mailto:claire.martin@echappee-belle.fr");

  // La ligne déposant est présente même sans donnée de déposant
  await expect(page.getByText("Personne qui dépose le dossier")).toBeVisible();
});

test("l'entête affiche le porteur de projet personne physique (prénom nom)", async ({
  page,
  db,
  loginAs,
}) => {
  const { codeAcces, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@porteur-physique.fr",
    dossierNom: "Dossier porteur personne physique e2e",
    porteurDeProjet: {
      type: "personne physique",
      nom: "PETIT",
      prenom: "Jean",
      qualification: "Propriétaire de l'immeuble",
      adresse: "rue de la Paix\n57100 Thionville",
      telephone: "03 82 00 00 03",
      email: "jean.petit@example.fr",
    },
  });

  await loginAs(codeAcces);
  await page.goto(`/dossier/${dossier.id}`);
  await expect(page.getByRole("heading", { name: dossier.nom! })).toBeVisible();

  await expect(page.getByText("Personne qui porte le projet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Jean PETIT" })).toHaveAttribute(
    "href",
    "mailto:jean.petit@example.fr",
  );
});
