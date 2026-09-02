import { expect, test, vi } from "vitest";

vi.mock(import("$lib/especes/activitesMethodesMoyensDePoursuite.ts"), () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn().mockResolvedValue({
    identifiantPitchouVersActivitéEtImpactsQuantifiés: new Map(),
  }),
}));

vi.mock("./DossierGenerationDocuments/generationTags.ts", () => ({
  getDocumentGenerationTags: vi.fn(() => ({
    nom: "Parc éolien <Test>",
    activité_principale: "Énergie éolienne",
    localisation: "Nantes",
    liste_départements: ["44", "49"],
    demandeur: { nom: "Société Exemple" },
    numéro_dossier: "12345",
    régime_autorisation_environnementale: "Oui",
    motif_dérogation: "Intérêt public majeur",
    identifiant_onagre: "ONAGRE-1",
    liste_espèces_par_impact: [
      {
        impact: "Destruction",
        liste_noms_impacts_quantifiés: ["Individus"],
        liste_espèces: [
          {
            nomVernaculaire: "Hirondelle",
            nomScientifique: "Hirundo rustica",
            liste_impacts_quantifiés: [2],
            estCNPN: true,
            estMinistérielle: false,
          },
        ],
      },
    ],
  })),
}));

import { createCnpnEmailDraft, updateCnpnAttachmentList } from "./cnpnEmailDraft.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

test("reprend l'objet et le contenu du modèle de saisine CNPN", async () => {
  const draft = await createCnpnEmailDraft({} as DossierFull, "instructeur@example.com", undefined);

  expect(draft.subject).toBe(
    "Saisine du CNPN - Énergie éolienne - Parc éolien <Test> - Nantes, 44, 49",
  );
  expect(draft.htmlBody).toContain("Je vous prie de bien vouloir trouver");
  expect(draft.htmlBody).toContain("ONAGRE-1");
  expect(draft.htmlBody).toContain("Hirundo rustica");
  expect(draft.htmlBody).toContain("Espèce CNPN");
  expect(draft.htmlBody).toContain("Parc éolien &lt;Test&gt;");
});

test("synchronise la liste des pièces jointes avec la sélection", async () => {
  const draft = await createCnpnEmailDraft({} as DossierFull, "instructeur@example.com", undefined);

  expect(updateCnpnAttachmentList(draft.htmlBody, ["saisine <CNPN>.pdf", "annexe.pdf"])).toContain(
    "<li>saisine &lt;CNPN&gt;.pdf</li><li>annexe.pdf</li>",
  );
  expect(updateCnpnAttachmentList(draft.htmlBody, [])).toContain(
    "<li>Aucune pièce jointe sélectionnée</li>",
  );
  expect(updateCnpnAttachmentList(draft.htmlBody, ["rapport-$&-$1.pdf"])).toContain(
    "<li>rapport-$&amp;-$1.pdf</li>",
  );
});
