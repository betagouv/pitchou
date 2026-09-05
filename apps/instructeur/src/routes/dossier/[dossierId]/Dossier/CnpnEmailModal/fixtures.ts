import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const saisineId = "11111111-1111-4111-8111-111111111111" as FileId;
const csrpnSaisineId = "22222222-2222-4222-8222-222222222222" as FileId;
export const latestSaisineId = "33333333-3333-4333-8333-333333333333" as FileId;
export const dossier = {
  id: 42,
  name: "Projet test",
  piecesJointesPetitionnaires: [],
  avisExpert: [
    {
      expert: "CNPN",
      saisine_date: "2026-08-01",
      saisine_fichier_url: `/avis-expert/fichier/${saisineId}`,
      saisine_fichier_description: {
        id: saisineId,
        name: "saisine.pdf",
        media_type: "application/pdf",
        size: 1024,
        url: `/avis-expert/fichier/${saisineId}`,
      },
    },
    {
      expert: "CSRPN",
      saisine_date: "2026-08-01",
      saisine_fichier_url: `/avis-expert/fichier/${csrpnSaisineId}`,
      saisine_fichier_description: {
        id: csrpnSaisineId,
        name: "saisine-csrpn.pdf",
        media_type: "application/pdf",
        size: 2048,
        url: `/avis-expert/fichier/${csrpnSaisineId}`,
      },
    },
  ],
  decisionsAdministratives: [],
  otherAttachments: [],
} as unknown as DossierFull;
