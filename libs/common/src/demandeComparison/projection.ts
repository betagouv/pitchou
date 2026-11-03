import type {
  DemandeComparisonDocument,
  ComparisonSection,
} from "@pitchou/types/demandeComparison.ts";
import type { DemandeVersion } from "@pitchou/types/dossierDemandes.ts";
import { applicantFieldLabels } from "@pitchou/types/notification.ts";
import { record } from "./fields.ts";
import { identitySections, speciesSection, attachmentSections } from "./related.ts";
import { procedureSections } from "./procedure.ts";
import { comparePhaseEventsNewestFirst } from "../phases.ts";
import { chronologySections } from "./chronology.ts";

/** The caller supplies a version already authorized for internal reading. No access decisions live here. */
export function buildDemandeComparison({
  dossier,
  commentaires,
}: DemandeVersion): DemandeComparisonDocument {
  const sections: ComparisonSection[] = [
    projectSection(dossier),
    ...identitySections(dossier),
    speciesSection(dossier),
    ...procedureSections(dossier),
    {
      key: "commentaires",
      label: "Commentaires",
      records: commentaires.map((commentaire) =>
        record(
          "commentaire",
          "Commentaire",
          commentaire,
          {
            content: "Texte",
            created_at: "Date",
            author_email: "Auteur",
          },
          `${dossier.id}:${commentaire.id}`,
        ),
      ),
    },
  ];
  return {
    sections: [...sections, ...attachmentSections(dossier), ...chronologySections(dossier)],
  };
}

function projectSection(dossier: DemandeVersion["dossier"]): ComparisonSection {
  const {
    demandeur_personne_morale: _legacy,
    main_activite: _activity,
    ...projectLabels
  } = applicantFieldLabels;
  const phase =
    dossier.evenementsPhase.toSorted(comparePhaseEventsNewestFirst)[0]?.phase ??
    "Accompagnement amont";
  const project = record("projet", "Informations du projet", dossier, projectLabels);
  project.fields.push({
    key: "activity",
    label: "Activité principale",
    value: dossier.activite_label ?? dossier.main_activite,
  });
  const instruction = record("instruction", "Instruction", dossier, {
    depot_date: "Date de premier contact",
    ddep_depot_date: "Date de dépôt de la DDEP",
    ddep_required: "DDEP nécessaire",
    er_mesures_sufficient: "Mesures ER suffisantes",
    enjeu: "Dossier à enjeu",
    next_action_expected_from: "Prochaine action attendue de",
    next_due_date: "Prochaine échéance",
    public_consultation_start_date: "Début de consultation du public",
    public_consultation_end_date: "Fin de consultation du public",
    onagre_demande_identifier: "Référence Onagre",
  });
  instruction.fields.unshift({ key: "phase", label: "Phase", value: phase });
  return { key: "demande", label: "Demande", records: [project, instruction] };
}
