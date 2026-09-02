import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
import { getDocumentGenerationTags } from "./DossierGenerationDocuments/generationTags.ts";
import type { ResultatImportFichierEspeces } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

function escapeHtml(value: unknown): string {
  return String(value ?? "Non renseigné")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const ATTACHMENT_LIST_PATTERN =
  /(<p><strong>Liste des éléments transmis en PJ\s*:\s*<\/strong><\/p>\s*)<ul>[\s\S]*?<\/ul>/;

export function updateCnpnAttachmentList(html: string, names: string[]): string {
  const items =
    names.length > 0
      ? names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
      : "<li>Aucune pièce jointe sélectionnée</li>";
  return html.replace(
    ATTACHMENT_LIST_PATTERN,
    (_, heading: string) => `${heading}<ul>${items}</ul>`,
  );
}

function value(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Non renseigné";
  if (value === null || value === undefined || value === "") return "Non renseigné";
  return String(value);
}

export async function createCnpnEmailDraft(
  dossier: DossierFull,
  senderEmail: string,
  especesImpactees: Promise<ResultatImportFichierEspeces> | undefined,
): Promise<{ subject: string; htmlBody: string }> {
  const {
    identifiantPitchouVersActivitéEtImpactsQuantifiés:
      identifiantPitchouVersActiviteEtImpactsQuantifies,
  } = await loadActivitesMethodesMoyensDePoursuite();
  let impacts;
  try {
    impacts = (await especesImpactees)?.impactEspece;
  } catch {
    impacts = undefined;
  }
  const tags = getDocumentGenerationTags(
    dossier,
    impacts,
    identifiantPitchouVersActiviteEtImpactsQuantifies,
  );
  const subject = `Saisine du CNPN - ${value(tags.activité_principale)} - ${value(tags.nom)} - ${value(tags.localisation)}, ${value(tags.liste_départements)}`;
  const speciesSections = (tags.liste_espèces_par_impact ?? [])
    .map((group) => {
      const impactColumns = group.liste_noms_impacts_quantifiés ?? [];
      const rows = group.liste_espèces
        .map(
          (species) => `<tr>
            <td>${escapeHtml(species.nomVernaculaire)} (<em>${escapeHtml(species.nomScientifique)}</em>)</td>
            ${impactColumns
              .map(
                (_, index) =>
                  `<td>${escapeHtml(species.liste_impacts_quantifiés?.[index] ?? "")}</td>`,
              )
              .join("")}
            <td>${species.estMinistérielle ? "Espèce ministérielle" : ""}${species.estMinistérielle && species.estCNPN ? "<br>" : ""}${species.estCNPN ? "Espèce CNPN" : ""}</td>
          </tr>`,
        )
        .join("");
      return `<h3>${escapeHtml(group.impact)}</h3>
        <table border="1" cellpadding="6" cellspacing="0" width="100%">
          <thead><tr><th>Espèce</th>${impactColumns.map((name) => `<th>${escapeHtml(name)}</th>`).join("")}<th>Espèce CNPN/Ministérielle</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .join("");

  const htmlBody = `
    <p>Bonjour,</p>
    <p>Je vous prie de bien vouloir trouver, ci-joint, la saisine du CNPN concernant une demande de dérogation espèces protégées.</p>
    <ul>
      <li><strong>Nom du projet :</strong> ${escapeHtml(tags.nom)}</li>
      <li><strong>Porteur de projet :</strong> ${escapeHtml(tags.demandeur.nom)}</li>
      <li><strong>Identifiant du dossier sur Pitchou :</strong> ${escapeHtml(tags.numéro_dossier)}</li>
      <li><strong>Autorisation environnementale :</strong> ${escapeHtml(tags.régime_autorisation_environnementale)}</li>
      <li><strong>Activité principale du dossier :</strong> ${escapeHtml(tags.activité_principale)}</li>
      <li><strong>Localisation :</strong> ${escapeHtml(tags.localisation)}<br><strong>Numéros des départements :</strong> ${escapeHtml(value(tags.liste_départements))}</li>
      <li><strong>Motif de la dérogation :</strong> ${escapeHtml(tags.motif_dérogation)}</li>
    </ul>
    <p><strong>Liste des éléments transmis en PJ :</strong></p>
    <ul><li>À compléter selon les pièces jointes sélectionnées</li></ul>
    <table border="1" cellpadding="6" cellspacing="0" width="100%">
      <thead><tr><th>Année</th><th>Nom du projet</th><th>Numéro du projet sur ONAGRE</th><th>Correspondant en DREAL ou DDT</th></tr></thead>
      <tbody><tr><td>${new Date().getFullYear()}</td><td>${escapeHtml(tags.nom)}</td><td>${escapeHtml(tags.identifiant_onagre)}</td><td>${escapeHtml(senderEmail)}</td></tr></tbody>
    </table>
    ${speciesSections ? `<p>Les espèces visées par la présente dérogation sont les suivantes :</p>${speciesSections}` : ""}
    <p>En vous remerciant par avance de la suite donnée à ce mail,</p>
  `;
  return { subject, htmlBody };
}
