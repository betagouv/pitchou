import type { DuplicateFacts } from "./onagreDuplicates.ts";

export const confirmationLabels = {
  complete_reference: "Référence complète de demande",
  project_reference: "Référence projet et éléments concordants",
  corroborated_scope: "Périmètre et chronologie concordants",
  scoped_milestone: "Étape propre à cette demande",
  corroborated_text: "Description spécifique concordante",
  documented_reference_conflict: "Contradiction résolue par un acte original",
} as const;

export const confirmationExplanations = {
  complete_reference:
    "Le code complet permet de viser la demande précise. La revue vérifie aussi la cohérence du projet ; les différences conservées sont expliquées dans le motif.",
  project_reference:
    "Le code projet donne un point de départ, mais ne suffit pas à choisir une demande. La confirmation repose aussi sur les éléments propres détaillés ci-dessous.",
  corroborated_scope:
    "Ce cas a demandé une revue manuelle du lieu, de l’opération et de sa chronologie. Une ressemblance de titre seule ne suffisait pas.",
  scoped_milestone:
    "Une date ou une étape d’instruction propre à cette demande permet de la distinguer des autres campagnes du projet.",
  corroborated_text:
    "Un contenu descriptif très spécifique, concordant entre les deux sources, permet de reconnaître la même demande au-delà du titre.",
  documented_reference_conflict:
    "Ce cas n’était pas simple : un code contradictoire a nécessité la lecture de l’acte officiel et une décision explicite. Le code DN d’origine reste conservé.",
} as const;

export type ConfirmationProfile = keyof typeof confirmationLabels;
export type ConfirmedDuplicate = {
  demandeKey: string;
  projectId: string;
  projectName: string;
  sourceHash: string;
  confirmedAt: string;
  profile: ConfirmationProfile;
  reason: string;
  source: DuplicateFacts & { id: string };
  target: DuplicateFacts & { id: number; name: string };
  otherDemandesToReview: number;
  relatedExisting: { dossierId: number; reason: string }[];
};
