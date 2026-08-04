import { describe, expect, test } from "vitest";

import { evenementMetriqueGuard } from "./evenements_metriques.ts";

describe("evenementMetriqueGuard", () => {
  test("accepte l'ouverture de la modale d'ajout de pièce jointe depuis l'entête", () => {
    expect(
      evenementMetriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        details: { dossierId: 123, source: "enteteDossier" },
      }),
    ).toBe(true);
  });

  test("rejette l'ouverture de la modale d'ajout de pièce jointe avec une source inconnue", () => {
    expect(
      evenementMetriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        details: { dossierId: 123, source: "ailleurs" },
      }),
    ).toBe(false);
  });

  test("rejette l'ouverture de la modale d'ajout de pièce jointe sans dossier", () => {
    expect(
      evenementMetriqueGuard({
        type: "ouvrirModaleAjouterPieceJointe",
        details: { source: "enteteDossier" },
      }),
    ).toBe(false);
  });

  test("accepte l'ajout réussi d'une pièce jointe avec sa source", () => {
    expect(
      evenementMetriqueGuard({
        type: "ajouterPieceJointe",
        details: {
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
      evenementMetriqueGuard({
        type: "ajouterPieceJointe",
        details: {
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
      evenementMetriqueGuard({
        type: "ajouterPieceJointe",
        details: {
          dossierId: 123,
          source: "ongletPiecesJointes",
          typePieceJointe: "Inconnu",
          nombreFichiers: 1,
        },
      }),
    ).toBe(false);
  });

  test("accepts a dossier follower assignment with a non-negative count", () => {
    expect(
      evenementMetriqueGuard({
        type: "assignDossierFollowers",
        details: {
          dossierId: 123,
          followerCount: 2,
          addedPersonneEmails: ["added-one@test.fr", "added-two@test.fr"],
          removedPersonneEmails: ["removed@test.fr"],
        },
      }),
    ).toBe(true);
  });

  test("rejects a dossier follower assignment with an invalid count", () => {
    expect(
      evenementMetriqueGuard({
        type: "assignDossierFollowers",
        details: {
          dossierId: 123,
          followerCount: -1,
          addedPersonneEmails: [],
          removedPersonneEmails: [],
        },
      }),
    ).toBe(false);
  });

  test("rejects a dossier follower assignment without personne email lists", () => {
    expect(
      evenementMetriqueGuard({
        type: "assignDossierFollowers",
        details: { dossierId: 123, followerCount: 2 },
      }),
    ).toBe(false);
  });
});
