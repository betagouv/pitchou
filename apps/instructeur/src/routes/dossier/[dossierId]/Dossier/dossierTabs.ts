export type DossierTab =
  | "instruction"
  | "projet"
  | "porteur-de-projet"
  | "avis"
  | "controles"
  | "pieces-jointes"
  | "generation-document"
  | "echanges";

export const dossierTabs: { id: DossierTab; label: string }[] = [
  { id: "instruction", label: "Instruction" },
  { id: "projet", label: "Projet" },
  { id: "porteur-de-projet", label: "Porteur de projet" },
  { id: "echanges", label: "Échanges" },
  { id: "avis", label: "Avis" },
  { id: "controles", label: "Contrôles" },
  { id: "pieces-jointes", label: "Pièces jointes" },
  { id: "generation-document", label: "Génération document" },
];
