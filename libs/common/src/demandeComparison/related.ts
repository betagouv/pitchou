import type { ComparisonSection } from "@pitchou/types/demandeComparison.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { companyPropertyLabels, identityPropertyLabels } from "@pitchou/types/notification.ts";
import { involvementLabels } from "@pitchou/types/dossierActeur.ts";
import { record, fileField } from "./fields.ts";

export function identitySections(dossier: DossierFull): ComparisonSection[] {
  const sections: ComparisonSection[] = [];
  const porteur = dossier.porteur_de_projet;
  sections.push(
    {
      key: "porteur",
      label: "Porteur de projet",
      records: porteur
        ? [
            record(
              "porteur",
              "Identité",
              porteur,
              porteur.type === "personne_morale"
                ? companyPropertyLabels
                : { ...identityPropertyLabels, address: "Adresse" },
            ),
          ]
        : [],
    },
    {
      key: "acteurs",
      label: "Personnes impliquées",
      records: dossier.acteurs.map((acteur) => {
        const roles = acteur.involvements.map((role) => involvementLabels[role]).sort();
        return record(roles.join("/"), roles.join(", "), acteur, {
          ...identityPropertyLabels,
          address: "Adresse",
        });
      }),
    },
  );
  return sections;
}

export function speciesSection(dossier: DossierFull): ComparisonSection {
  return {
    key: "especes",
    label: "Espèces et impacts",
    records: dossier.especesImpactees.impacts.map((impact) => {
      const item = record(
        `${impact.espece.CD_REF}/${impact.typeImpact?.identifiantPitchou ?? ""}`,
        impact.espece.nomVernaculaire,
        impact,
        {
          methode: "Méthode",
          moyenDePoursuite: "Moyen de poursuite",
          nombreIndividus: "Nombre d’individus",
          nids: "Nids",
          oeufs: "Œufs",
          surfaceHabitatDetruit: "Surface d’habitat détruit (m²)",
        },
      );
      item.fields.unshift(
        {
          key: "espece",
          label: "Espèce",
          value: `${impact.espece.nomScientifique} (${impact.espece.CD_REF})`,
        },
        { key: "impact", label: "Type d’impact", value: impact.typeImpact?.libelle ?? null },
      );
      return item;
    }),
  };
}

export function attachmentSections(dossier: DossierFull): ComparisonSection[] {
  return [
    {
      key: "pieces",
      label: "Pièces jointes",
      records: dossier.piecesJointesPetitionnaires.map((file) => ({
        key: file.name,
        label: file.name,
        fields: [fileField("file", "Document", file)],
      })),
    },
    {
      key: "sourceEspeces",
      label: "Fichier des espèces",
      records: [
        {
          key: "source",
          label: "Document",
          fields: [fileField("file", "Fichier des espèces", dossier.especesImpactees.sourceFile)],
        },
      ],
    },
    {
      key: "attachments",
      label: "Autres pièces",
      records: dossier.otherAttachments.map((attachment) => ({
        ...record(
          attachment.type,
          attachment.type,
          attachment,
          { type: "Type", attachment_date: "Date" },
          `${dossier.id}:${attachment.id}`,
        ),
        fields: [
          { key: "type", label: "Type", value: attachment.type },
          {
            key: "date",
            label: "Date",
            value:
              attachment.attachment_date instanceof Date
                ? attachment.attachment_date.toJSON()
                : attachment.attachment_date,
          },
          fileField("file", "Document", attachment.fichier_description, attachment.fichier_url),
        ],
      })),
    },
  ];
}
