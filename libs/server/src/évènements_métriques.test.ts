import { describe, expect, test } from "vitest";

import { évènementMétriqueGuard } from "./évènements_métriques.ts";

describe("évènementMétriqueGuard", () => {
  test("accepte l'ouverture de la modale d'ajout de pièce jointe depuis l'entête", () => {
    expect(
      évènementMétriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: 123, source: "enteteDossier" },
      }),
    ).toBe(true);
  });

  test("rejette l'ouverture de la modale d'ajout de pièce jointe avec une source inconnue", () => {
    expect(
      évènementMétriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: 123, source: "ailleurs" },
      }),
    ).toBe(false);
  });

  test("rejette l'ouverture de la modale d'ajout de pièce jointe sans dossier", () => {
    expect(
      évènementMétriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { source: "enteteDossier" },
      }),
    ).toBe(false);
  });

  test("accepte l'ajout réussi d'une pièce jointe avec sa source", () => {
    expect(
      évènementMétriqueGuard({
        type: "ajouterPieceJointe",
        détails: {
          dossierId: 123,
          source: "ongletPiecesJointes",
          typePieceJointe: "Autre",
          nombreFichiers: 2,
        },
      }),
    ).toBe(true);
  });

  test("rejette l'ajout réussi d'une pièce jointe sans fichier", () => {
    expect(
      évènementMétriqueGuard({
        type: "ajouterPieceJointe",
        détails: {
          dossierId: 123,
          source: "ongletPiecesJointes",
          typePieceJointe: "Autre",
          nombreFichiers: 0,
        },
      }),
    ).toBe(false);
  });

  test("rejette l'ajout réussi d'une pièce jointe avec un type inconnu", () => {
    expect(
      évènementMétriqueGuard({
        type: "ajouterPieceJointe",
        détails: {
          dossierId: 123,
          source: "ongletPiecesJointes",
          typePieceJointe: "Inconnu",
          nombreFichiers: 1,
        },
      }),
    ).toBe(false);
  });
});
