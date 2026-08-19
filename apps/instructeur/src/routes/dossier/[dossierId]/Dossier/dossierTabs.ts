export type DossierTab =
  | "detail-du-projet"
  | "instruction"
  | "avis"
  | "controles"
  | "historique"
  | "pieces-jointes"
  | "generation-document";

export const dossierTabs: { id: DossierTab; label: string; icon: string }[] = [
  { id: "detail-du-projet", label: "Détail du projet", icon: "fr-icon-briefcase-line" },
  { id: "instruction", label: "Instruction", icon: "fr-icon-survey-line" },
  { id: "avis", label: "Avis d’experts", icon: "fr-icon-quote-line" },
  { id: "controles", label: "Contrôle", icon: "fr-icon-eye-line" },
  { id: "historique", label: "Historique", icon: "fr-icon-time-line" },
  { id: "pieces-jointes", label: "Pièces jointes", icon: "fr-icon-attachment-line" },
  { id: "generation-document", label: "Générateur de documents", icon: "fr-icon-file-text-line" },
];

/** Tab ids that existed before the tab rework, mapped to their replacement. */
const legacyTabAliases: Record<string, DossierTab> = {
  projet: "detail-du-projet",
  "porteur-de-projet": "detail-du-projet",
};

export function parseDossierTab(hash: string): DossierTab | undefined {
  const tab = hash.replace(/^#/, "");
  if (dossierTabs.some(({ id }) => id === tab)) return tab as DossierTab;
  return legacyTabAliases[tab];
}
