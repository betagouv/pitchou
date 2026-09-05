import { expect, test } from "vitest";
import { piecesJointesAvis } from "./piecesJointes.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const olderId = "11111111-1111-4111-8111-111111111111" as FileId;
const latestId = "22222222-2222-4222-8222-222222222222" as FileId;

test("présélectionne seulement la dernière saisine CNPN", () => {
  const dossier = {
    avisExpert: [
      {
        expert: "CNPN",
        saisine_date: "2026-08-20",
        saisine_fichier_url: `/avis-expert/fichier/${olderId}`,
        saisine_fichier_description: { id: olderId, created_at: "2026-08-01" },
      },
      {
        expert: "CNPN",
        saisine_date: "2026-08-15",
        saisine_fichier_url: `/avis-expert/fichier/${latestId}`,
        saisine_fichier_description: { id: latestId, created_at: "2026-08-16" },
      },
    ],
  } as unknown as DossierFull;

  expect(
    piecesJointesAvis(dossier)
      .filter((piece) => piece.selectedForCnpnByDefault)
      .map((piece) => piece.fileId),
  ).toEqual([latestId]);
});
