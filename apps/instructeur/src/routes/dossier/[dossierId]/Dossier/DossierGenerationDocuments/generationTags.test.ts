import { expect, test } from "vitest";

import { getDocumentGenerationTags } from "./generationTags.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

test("génère les balises sans espèces impactées", () => {
  const dossier = {
    id: "dossier-1",
    name: "Dossier sans espèces",
  } as unknown as DossierFull;

  const tags = getDocumentGenerationTags(dossier, []);

  expect(tags.nom).toBe("Dossier sans espèces");
  expect(tags.localisation).toBe("(inconnue)");
  expect(tags.liste_espèces_par_impact).toBeUndefined();
});

test("utilise le département principal explicite dans les balises", () => {
  const dossier = {
    id: "dossier-1",
    name: "Dossier multi-départements",
    primary_department: "75",
    departments: ["69"],
  } as unknown as DossierFull;

  const tags = getDocumentGenerationTags(dossier, []);

  expect(tags.département_principal).toBe("75");
  expect(tags.nom_département_principal).toBe("Paris");
  expect(tags.liste_départements).toEqual(["69"]);
});

test("les balises du porteur de projet viennent de porteur_de_projet, sans repli sur le déposant", () => {
  const tags = (porteur_de_projet: unknown) =>
    getDocumentGenerationTags(
      {
        id: "dossier-1",
        porteur_de_projet,
        deposant_email: "deposant@test.fr",
      } as unknown as DossierFull,
      [],
    ).porteur_de_projet;

  const morale = tags({
    type: "personne_morale",
    siret: "12345678900012",
    legal_name: "EDF",
    address: "2 rue B",
  });
  expect(morale.nom).toBe("EDF");
  expect(morale.adresse).toBe("2 rue B");
  expect(String(morale)).toBe("EDF (12345678900012)");

  const physique = tags({
    type: "personne_physique",
    first_names: "Camille",
    last_name: "Martin",
    address: null,
  });
  expect(physique.nom).toBe("Camille Martin");
  expect(String(physique)).toBe("Martin Camille");

  const aucun = tags(null);
  expect(aucun.nom).toBe("Non renseigné");
  expect(aucun.adresse).toBe("");
  expect(String(aucun)).toBe("Non renseigné");
});

test("l'ancienne balise demandeur reste un alias de porteur_de_projet", () => {
  const tags = getDocumentGenerationTags({ id: "dossier-1" } as unknown as DossierFull, []);
  expect(tags.demandeur).toBe(tags.porteur_de_projet);
});
