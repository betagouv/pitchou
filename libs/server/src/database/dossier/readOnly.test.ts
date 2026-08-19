import { expect, test } from "vitest";

import { dossierFullForReadOnly } from "./readOnly.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

function fakeDossier(): DossierFull {
  return {
    id: 123,
    name: "Dossier test",
    free_comment: "Note interne de l'instructeur",
    latestCommentaire: "Dernier commentaire du service",
    evenementsPhase: [{ dossier: 123, phase: "Instruction", timestamp: new Date("2026-02-01") }],
    piecesJointesPetitionnaires: [{ url: "/piece-jointe-petitionnaire/fichier/1", name: "ddep" }],
    avisExpert: [
      {
        id: "avis-cnpn",
        expert: "CNPN",
        avis: "Favorable",
        avis_date: new Date("2026-03-01"),
        avis_fichier_url: "/avis-expert/fichier/10",
        avis_fichier_description: { url: "/avis-expert/fichier/10", name: "avis-cnpn.pdf" },
        saisine_date: new Date("2026-02-01"),
        saisine_fichier_url: "/avis-expert/fichier/11",
        saisine_fichier_description: { url: "/avis-expert/fichier/11", name: "saisine-cnpn.pdf" },
      },
      {
        id: "avis-autre",
        expert: "Autre expert",
        avis_date: new Date("2026-03-02"),
        avis_fichier_url: "/avis-expert/fichier/20",
        saisine_date: new Date("2026-02-02"),
        saisine_fichier_url: "/avis-expert/fichier/21",
      },
    ],
    decisionsAdministratives: [
      {
        id: "decision-1",
        number: "AP-001",
        type: "Arrêté dérogation",
        fichier_url: "/decision-administrative/fichier/30",
        prescriptions: [
          {
            id: "prescription-1",
            description: "Prescription interne",
            controles: [{ id: "controle-1", resultat: "Conforme" }],
          },
        ],
      },
    ],
    otherAttachments: [
      { id: "attachment-1", type: "Autre", fichier_url: "/attachment-autre/fichier/40" },
    ],
  } as unknown as DossierFull;
}

test("un dossier en lecture seule ne contient aucun élément interne au service", () => {
  const shared = dossierFullForReadOnly(fakeDossier());

  // Commentaires, including the legacy column they were migrated from.
  expect(shared.free_comment).toBe("");
  expect(shared.latestCommentaire).toBeNull();

  // Only the official avis, and never the saisine that produced it.
  expect(shared.avisExpert.map(({ expert }) => expert)).toEqual(["CNPN"]);
  expect(shared.avisExpert[0]!.saisine_date).toBeNull();
  expect(shared.avisExpert[0]!.saisine_fichier_url).toBeUndefined();
  expect(shared.avisExpert[0]!.saisine_fichier_description).toBeUndefined();

  // The décision administrative is shared, its follow-up work is not.
  expect(shared.decisionsAdministratives).toHaveLength(1);
  expect(shared.decisionsAdministratives![0]!.prescriptions).toBeUndefined();

  expect(shared.otherAttachments).toEqual([]);

  // Nothing internal survives anywhere in the serialized payload — this is what
  // actually reaches the browser.
  const wire = JSON.stringify(shared);
  for (const secret of [
    "Note interne de l'instructeur",
    "Dernier commentaire du service",
    "Prescription interne",
    "Autre expert",
    "/avis-expert/fichier/11",
    "/avis-expert/fichier/20",
    "/attachment-autre/fichier/40",
  ]) {
    expect(wire).not.toContain(secret);
  }
});

test("un dossier en lecture seule garde ce qui est partagé", () => {
  const shared = dossierFullForReadOnly(fakeDossier());

  expect(shared.id).toBe(123);
  expect(shared.name).toBe("Dossier test");
  // The instruction tab shows the phase timeline, and the contrôles tab reads
  // the current phase from it.
  expect(shared.evenementsPhase).toHaveLength(1);
  // « Projet » attachments, the official avis file and the décision file.
  expect(shared.piecesJointesPetitionnaires).toHaveLength(1);
  expect(shared.avisExpert[0]!.avis_fichier_url).toBe("/avis-expert/fichier/10");
  expect(shared.decisionsAdministratives![0]!.fichier_url).toBe(
    "/decision-administrative/fichier/30",
  );
});

test("la projection ne modifie pas le dossier d'origine", () => {
  const dossier = fakeDossier();
  dossierFullForReadOnly(dossier);

  expect(dossier.avisExpert).toHaveLength(2);
  expect(dossier.avisExpert[0]!.saisine_fichier_url).toBe("/avis-expert/fichier/11");
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toHaveLength(1);
  expect(dossier.otherAttachments).toHaveLength(1);
});
