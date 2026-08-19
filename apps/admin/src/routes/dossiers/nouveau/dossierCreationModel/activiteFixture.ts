// Test fixture: the few activities the creation-model tests use, mirroring the referentiel seed.

import { activiteCodeForLabel } from "@pitchou/common/activiteCodes.ts";
import type { ActiviteAdmin } from "$lib/actions/adminActivites.ts";
import type { DossierCreationModel } from "./state.ts";

export const ACTIVITE_CODE_BY_LABEL_FIXTURE: ReadonlyMap<string, string> = new Map([
  ["Carrières", "carrieres"],
  ["Demande à caractère scientifique", "demande-scientifique"],
  ["Desaîrage", "desairage"],
  ["Infrastructures de transport ferroviaire", "transport-ferroviaire"],
  ["Production énergie renouvelable - Éolien -  Suivi mortalité", "energie-eolien-suivi-mortalite"],
  [
    "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
    "restauration-batiments",
  ],
]);

export const ACTIVITES_FIXTURE: ActiviteAdmin[] = [...ACTIVITE_CODE_BY_LABEL_FIXTURE].map(
  ([label, code]) => ({ code, label }),
);

/** Sets the activity as the form select would: display label plus resolved code. */
export function setModelActivite(model: DossierCreationModel, label: string): void {
  model.mainActivite = label;
  model.activiteCode = label
    ? (activiteCodeForLabel(label, ACTIVITE_CODE_BY_LABEL_FIXTURE) ?? "")
    : "";
}
