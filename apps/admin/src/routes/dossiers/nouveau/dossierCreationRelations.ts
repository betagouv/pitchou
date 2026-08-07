import type {
  AdminDossierDetail,
  AdminDossierRelationsPayload,
} from "$lib/actions/adminDossiers.ts";
import type { CompanyDetailsChoice } from "./dossierCreationState.ts";

export function hasLegalSiretChanged(detail: AdminDossierDetail, legalSiret: string): boolean {
  return (
    !!detail.demandeur_personne_morale &&
    detail.demandeur_personne_morale.siret !== legalSiret.replaceAll(" ", "")
  );
}

export function mergeDossierRelationsForEdit(
  relations: AdminDossierRelationsPayload,
  detail: AdminDossierDetail,
  companyDetailsChoice: CompanyDetailsChoice,
): AdminDossierRelationsPayload {
  const identites = [
    ...relations.identites,
    ...detail.identites.filter(
      ({ type }) =>
        type === "mandataire" && !relations.identites.some((item) => item.type === type),
    ),
  ];
  if (relations.demandeur_type !== "personne_morale" || !detail.demandeur_personne_morale)
    return { ...relations, identites };
  const changed =
    detail.demandeur_personne_morale.siret !== relations.demandeur_personne_morale.siret;
  const demandeur =
    !changed || companyDetailsChoice === "keep"
      ? { ...detail.demandeur_personne_morale, siret: relations.demandeur_personne_morale.siret }
      : relations.demandeur_personne_morale;
  return { ...relations, identites, demandeur_personne_morale: demandeur };
}
