import type { AdminDossierMinimalCreationPayload } from "$lib/actions/adminDossiers.ts";
import { legalSiretError } from "./nouveau/dossierCreationModel.ts";

export type PorteurForm = {
  type: "" | "personne_physique" | "personne_morale";
  lastName: string;
  firstNames: string;
  siret: string;
};
export type PorteurField = keyof PorteurForm;

export const emptyPorteurForm = (): PorteurForm => ({
  type: "",
  lastName: "",
  firstNames: "",
  siret: "",
});

/** Id of the input that receives the focus for each field. */
export const porteurFieldIds: Record<PorteurField, string> = {
  type: "new-porteur-physique",
  lastName: "new-porteur-last-name",
  firstNames: "new-porteur-first-names",
  siret: "new-porteur-siret",
};

/** Errors of the porteur de projet, in display order; empty when it can be created. */
export function porteurFormErrors(form: PorteurForm): Partial<Record<PorteurField, string>> {
  if (!form.type) {
    return { type: "Indiquez si le porteur de projet est une personne physique ou morale." };
  }
  if (form.type === "personne_morale") {
    const siret = legalSiretError(form.siret);
    return siret ? { siret } : {};
  }
  return {
    ...(form.lastName.trim() ? {} : { lastName: "Renseignez le nom." }),
    ...(form.firstNames.trim() ? {} : { firstNames: "Renseignez le prénom." }),
  };
}

export function porteurPayload(
  form: PorteurForm,
): AdminDossierMinimalCreationPayload["porteur_de_projet"] {
  return form.type === "personne_morale"
    ? { type: "personne_morale", siret: form.siret.replaceAll(" ", "") }
    : {
        type: "personne_physique",
        last_name: form.lastName.trim(),
        first_names: form.firstNames.trim(),
      };
}
