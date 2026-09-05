import { expect, test, vi } from "vitest";

vi.mock("./DossierGenerationDocuments/generationTags.ts", () => ({
  getDocumentGenerationTags: vi.fn(() => ({
    nom: "Parc éolien <Test>",
    activité_principale: "Énergie éolienne",
    localisation: "Nantes",
    liste_départements: ["44", "49"],
    demandeur: { nom: "Société Exemple" },
    numéro_dossier: "12345",
    régime_autorisation_environnementale: true,
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
import { getDocumentGenerationTags } from "./DossierGenerationDocuments/generationTags.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

test("reprend l'objet et le contenu du modèle de saisine CNPN", async () => {
  const draft = await createCnpnEmailDraft(
    { especesImpactees: { impacts: [] } } as unknown as DossierFull,
    "instructeur@example.com",
  );

  expect(draft.subject).toBe(
    "Saisine du CNPN - Énergie éolienne - Parc éolien <Test> - Nantes, 44, 49",
  );
  expect(draft.htmlBody).toContain("Je vous prie de bien vouloir trouver");
  expect(draft.htmlBody).toContain("ONAGRE-1");
  expect(draft.htmlBody).toContain("Hirundo rustica");
  expect(draft.htmlBody).toContain("Espèce CNPN");
  expect(draft.htmlBody).toContain("Parc éolien &lt;Test&gt;");
  expect(draft.htmlBody).toContain("<strong>Autorisation environnementale :</strong> Oui");
});

test.each([
  [true, "Oui"],
  [false, "Non"],
  [null, "Non renseigné"],
] as const)("traduit le régime AE %s uniquement dans le mail", async (regime, label) => {
  const { getDocumentGenerationTags: generateTags } = await vi.importActual<
    typeof import("./DossierGenerationDocuments/generationTags.ts")
  >("./DossierGenerationDocuments/generationTags.ts");
  const dossier = {
    linked_to_ae_regime: regime,
    especesImpactees: { impacts: [] },
  } as unknown as DossierFull;
  const tags = generateTags(dossier, []);
  vi.mocked(getDocumentGenerationTags).mockReturnValueOnce(tags);

  const draft = await createCnpnEmailDraft(dossier, "instructeur@example.com");

  expect(draft.htmlBody).toContain(
    `<strong>Autorisation environnementale :</strong> ${label}</li>`,
  );
  expect(tags.régime_autorisation_environnementale).toBe(regime ?? "Non renseigné");
});

test("synchronise la liste des pièces jointes avec la sélection", async () => {
  const draft = await createCnpnEmailDraft(
    { especesImpactees: { impacts: [] } } as unknown as DossierFull,
    "instructeur@example.com",
  );

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

test.each([
  '<p style="text-align: justify;"><strong>Liste des éléments transmis en PJ :</strong></p>',
  '<h2 style="text-align: center;"><em>Liste des éléments</em> transmis en <u>PJ :</u></h2>',
  "<p>Liste des éléments transmis en PJ :</p>",
])("synchronise les PJ après mise en forme du titre %s", (heading) => {
  const before = "<p>Introduction</p><ul><li>Ne pas modifier</li></ul>";
  const after = "<p>Conclusion</p><ul><li>Autre liste</li></ul>";
  const html = `${before}${heading}<ul class="attachments"><li><p>ancien.pdf</p></li></ul>${after}`;

  const updated = updateCnpnAttachmentList(html, ["nouveau.pdf"]);
  expect(updated).toBe(
    `${before}${heading}<ul class="attachments"><li>nouveau.pdf</li></ul>${after}`,
  );
  expect(updateCnpnAttachmentList(updated, [])).toBe(
    `${before}${heading}<ul class="attachments"><li>Aucune pièce jointe sélectionnée</li></ul>${after}`,
  );
});

test("ne remplace pas une autre liste si le titre des PJ a été supprimé", () => {
  const html = "<p>Autre liste</p><ul><li>Texte conservé</li></ul>";
  expect(updateCnpnAttachmentList(html, ["rapport.pdf"])).toBe(html);
});
