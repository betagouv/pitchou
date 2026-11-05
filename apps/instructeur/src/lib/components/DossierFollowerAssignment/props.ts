import type Dossier from "@pitchou/types/database/public/Dossier.ts";

export type ActionsMenuProps = {
  dossierId: Dossier["id"];
  dossierName: Dossier["name"];
  showDeadline?: boolean;
  outlined?: boolean;
  onEditDueDate?: () => void;
  onAssignmentSaved?: () => void;
  /** Context-specific entries appended after the shared ones. */
  extraItems?: { label: string; icon?: string; onClick: () => void }[];
};
