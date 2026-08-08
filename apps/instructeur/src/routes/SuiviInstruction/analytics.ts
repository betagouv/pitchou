import { sendDossierSearchEvent } from "$lib/shared/aarri.ts";
import { NO_INSTRUCTEUR } from "./state.svelte.ts";
import type { DossierNextActionExpectedFrom, DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { TableSort } from "@pitchou/types/interfaceUtilisateur.ts";

export function trackSuiviSearch(state: {
  email: string;
  text: string;
  resultCount: number;
  instructeurOptionCount: number;
  selectedInstructeurs: Set<string>;
  selectedPhases: Set<DossierPhase>;
  selectedNextActions: Set<DossierNextActionExpectedFrom | "(vide)">;
  selectedActivities: Set<string>;
}) {
  sendDossierSearchEvent({
    filters: {
      followedBy: {
        selectedCount:
          state.selectedInstructeurs.size -
          (state.selectedInstructeurs.has(NO_INSTRUCTEUR) ? 1 : 0),
        totalCount: state.instructeurOptionCount - 1,
        includesSelf: state.selectedInstructeurs.has(state.email),
      },
      withoutInstructeur: state.selectedInstructeurs.has(NO_INSTRUCTEUR),
      phases: [...state.selectedPhases],
      nextActionExpectedFrom: [...state.selectedNextActions],
      activitesPrincipales: [...state.selectedActivities],
      ...(state.text ? { text: state.text } : {}),
    },
    resultCount: state.resultCount,
  });
}

export function persistSuiviState(
  remember: any,
  sort: TableSort | undefined,
  state: {
    selectedPhases: Set<DossierPhase>;
    selectedNextActions: Set<DossierNextActionExpectedFrom | "(vide)">;
    selectedInstructeurs: Set<string>;
    selectedActivities: Set<string>;
    text: string;
  },
) {
  remember(sort, {
    phases: state.selectedPhases,
    "prochaine action attendue de": state.selectedNextActions,
    instructeurs: state.selectedInstructeurs,
    activitesPrincipales: state.selectedActivities,
    texte: state.text,
  });
}
