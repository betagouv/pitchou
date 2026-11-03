import type { ComparisonSection } from "@pitchou/types/demandeComparison.ts";
import type { DossierFull, FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
import { record, fileField } from "./fields.ts";

export function procedureSections(dossier: DossierFull): ComparisonSection[] {
  return [
    {
      key: "avis",
      label: "Avis",
      records: dossier.avisExpert.map((avis) => {
        return avisRecord(dossier.id, avis);
      }),
    },
    {
      key: "decisions",
      label: "Décisions administratives",
      records: (dossier.decisionsAdministratives ?? []).map((decision) => {
        return decisionRecord(dossier.id, decision);
      }),
    },
  ];
}

function avisRecord(dossierId: number, avis: DossierFull["avisExpert"][number]) {
  const item = record(
    avis.expert ?? "",
    avis.expert ?? "Expert non renseigné",
    avis,
    {
      expert: "Expert",
      avis: "Avis",
      avis_date: "Date de l’avis",
      saisine_date: "Date de saisine",
    },
    `${dossierId}:${avis.id}`,
  );
  item.fields.push(
    fileField(
      "avisFile",
      "Document de l’avis",
      avis.avis_fichier_description,
      avis.avis_fichier_url,
    ),
    fileField(
      "saisineFile",
      "Courrier de saisine",
      avis.saisine_fichier_description,
      avis.saisine_fichier_url,
    ),
  );
  return item;
}

function decisionRecord(
  dossierId: number,
  decision: NonNullable<DossierFull["decisionsAdministratives"]>[number],
) {
  const item = record(
    `${decision.type}/${decision.number ?? ""}`,
    decision.type ?? "Décision",
    decision,
    {
      number: "Numéro",
      type: "Type",
      signature_date: "Date de signature",
      obligations_end_date: "Fin des obligations",
    },
    `${dossierId}:${decision.id}`,
  );
  item.fields.push(
    fileField("file", "Document", decision.fichier_description, decision.fichier_url),
  );
  item.sections = [
    {
      key: "prescriptions",
      label: "Prescriptions",
      records: (decision.prescriptions ?? []).map((prescription) =>
        prescriptionRecord(dossierId, prescription),
      ),
    },
  ];
  return item;
}

function prescriptionRecord(dossierId: number, prescription: FrontEndPrescription) {
  return {
    ...record(
      prescription.article_number ?? "",
      `Article ${prescription.article_number ?? "non renseigné"}`,
      prescription,
      {
        article_number: "Article",
        description: "Description",
        due_date: "Échéance",
        avoided_surface: "Surface évitée (m²)",
        compensated_surface: "Surface compensée (m²)",
        avoided_nids: "Nids évités",
        compensated_nids: "Nids compensés",
        avoided_individus: "Individus évités",
        compensated_individus: "Individus compensés",
      },
      `${dossierId}:${prescription.id}`,
    ),
    sections: [
      {
        key: "controles",
        label: "Contrôles",
        records: (prescription.controles ?? []).map((controle) =>
          record(
            "controle",
            "Contrôle",
            controle,
            {
              controle_date: "Date",
              result: "Résultat",
              comment: "Commentaire",
              post_controle_action_type: "Action après contrôle",
              post_controle_action_date: "Date de l’action",
              next_due_date: "Prochaine échéance",
            },
            `${dossierId}:${controle.id}`,
          ),
        ),
      },
    ],
  };
}
