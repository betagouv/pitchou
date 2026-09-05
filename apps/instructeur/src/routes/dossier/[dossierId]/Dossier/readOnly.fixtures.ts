import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export function fakeDossier(): DossierFull {
  return {
    id: 123 as DossierId,
    name: "Dossier test",
    communes: null,
    departments: ["01"],
    regions: null,
    main_activite: "Travaux",
    source: "demarche_numerique",
    demarche_numerique_number: "456",
    enjeu: false,
    onagre_demande_identifier: null,
    latestCommentaire: null,
    ddep_required: null,
    er_mesures_sufficient: null,
    next_action_expected_from: null,
    next_action_expected: null,
    next_due_date: null,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
    depot_date: new Date("2026-01-15"),
    evenementsPhase: [],
    avisExpert: [
      {
        id: "avis-cnpn",
        expert: "CNPN",
        avis: "Avis favorable",
        saisine_date: new Date("2026-02-01"),
        saisine_fichier_url: "/fichier/saisine-cnpn",
        saisine_fichier_description: { id: "saisine-cnpn" },
        avis_date: new Date("2026-03-01"),
        avis_fichier_url: "/fichier/avis-cnpn",
      },
      {
        id: "avis-autre",
        expert: "Autre expert",
        saisine_date: new Date("2026-02-02"),
        saisine_fichier_url: "/fichier/saisine-autre",
        avis_date: new Date("2026-03-02"),
        avis_fichier_url: "/fichier/avis-autre",
      },
    ],
    cnpnEmailSentEvents: [
      {
        id: "email-unrelated",
        attachment_ids: ["another-saisine"],
        sent_at: new Date("2026-02-10"),
        opened_at: new Date("2026-02-11"),
      },
      {
        id: "email-cnpn",
        attachment_ids: ["saisine-cnpn"],
        sent_at: new Date("2026-02-03"),
        opened_at: new Date("2026-02-04"),
      },
    ],
    decisionsAdministratives: [
      {
        id: "decision-1",
        type: "Arrêté dérogation",
        number: "AP-001",
        signature_date: new Date("2026-04-01"),
        fichier_url: "/fichier/arrete",
        prescriptions: [
          { id: "prescription-1", article_number: "ART-7", description: "Prescription secrète" },
        ],
      },
    ],
    piecesJointesPetitionnaires: [],
    especesImpactees: { sourceFile: undefined, impacts: [] },
    otherAttachments: [
      { type: "Autre", fichier_url: "/fichier/autre", attachment_date: new Date("2026-05-01") },
    ],
  } as unknown as DossierFull;
}
