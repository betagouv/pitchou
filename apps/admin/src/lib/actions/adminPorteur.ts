import type { PorteurDeProjetOrganisation } from "@pitchou/types/porteurDeProjet.ts";
import type { AdminDossierDetail } from "./adminDossierTypes.ts";
import { checkResponse } from "./adminResponse.ts";

export type AdminPorteurUpdate =
  | PorteurDeProjetOrganisation
  | { type: "personne_morale"; siret: string };

export async function updateDossierPorteur(
  dossierId: number,
  porteur: AdminPorteurUpdate,
): Promise<AdminDossierDetail> {
  const response = await fetch(`/api/dossiers/${dossierId}/porteur`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ porteur_de_projet: porteur }),
  });
  await checkResponse(response, "de l'enregistrement du porteur de projet");
  return (await response.json()) as AdminDossierDetail;
}
