import { describe, expect, test } from "vitest";

import { parseMinimalCreationRelations } from "./minimalCreation.ts";

const body = (porteur_de_projet: unknown) => ({
  name: "Dossier",
  groupe_instructeurs: "groupe-1",
  porteur_de_projet,
});

describe("parseMinimalCreationRelations", () => {
  test("builds the relations of a personne physique porteur", () => {
    expect(
      parseMinimalCreationRelations(
        body({ type: "personne_physique", last_name: " Martin ", first_names: "Camille" }),
      ),
    ).toMatchObject({
      groupe_instructeurs: "groupe-1",
      demandeur_type: "personne_physique",
      demandeur_personne_physique: { last_name: "Martin", first_names: "Camille" },
      identites: [{ type: "demandeur", last_name: "Martin", first_names: "Camille" }],
    });
  });

  test("builds the relations of a personne morale porteur, without identity", () => {
    expect(
      parseMinimalCreationRelations(body({ type: "personne_morale", siret: "432 296 234 00029" })),
    ).toMatchObject({
      demandeur_type: "personne_morale",
      demandeur_personne_morale: { siret: "43229623400029", legal_name: null },
      identites: [],
    });
  });

  test("rejects a dossier without a complete porteur", () => {
    for (const porteur of [
      undefined,
      { type: "autre" },
      { type: "personne_physique", last_name: "Martin", first_names: "" },
      { type: "personne_morale", siret: "1234" },
      { type: "personne_morale", siret: "43229623400029", legal_name: "EDF" },
    ])
      expect(() => parseMinimalCreationRelations(body(porteur))).toThrow();
  });
});
