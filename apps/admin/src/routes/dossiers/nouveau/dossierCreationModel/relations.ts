import type {
  AdminDemandeurPersonneMorale,
  AdminDossierDetail,
  AdminDossierRelationsPayload,
} from "#lib/actions/adminDossiers.ts";
import type { CompanyDetailsChoice } from "./state.ts";
import { acteurOf, identiteOf } from "#lib/dossierActeurs.ts";

/** Entreprise of a personne morale porteur, with only the fields the admin relations carry. */
export function porteurEntreprise(detail: AdminDossierDetail): AdminDemandeurPersonneMorale | null {
  const porteur = detail.porteur_de_projet;
  if (porteur?.type !== "personne_morale") return null;
  const { siret, legal_name, address, postal_code, department, region } = porteur;
  return { siret, legal_name, address, postal_code, department, region };
}

export function hasLegalSiretChanged(detail: AdminDossierDetail, legalSiret: string): boolean {
  const entreprise = porteurEntreprise(detail);
  return !!entreprise && entreprise.siret !== legalSiret.replaceAll(" ", "");
}

export function mergeDossierRelationsForEdit(
  relations: AdminDossierRelationsPayload,
  detail: AdminDossierDetail,
  companyDetailsChoice: CompanyDetailsChoice,
): AdminDossierRelationsPayload {
  // The creation form has no mandataire field: the current one is kept.
  const mandataire = identiteOf("mandataire", acteurOf(detail, "mandataire"));
  const identites =
    mandataire && !relations.identites.some(({ type }) => type === "mandataire")
      ? [...relations.identites, mandataire]
      : relations.identites;
  const entreprise = porteurEntreprise(detail);
  if (relations.demandeur_type !== "personne_morale" || !entreprise)
    return { ...relations, identites };
  const changed = entreprise.siret !== relations.demandeur_personne_morale.siret;
  const demandeur =
    !changed || companyDetailsChoice === "keep"
      ? { ...entreprise, siret: relations.demandeur_personne_morale.siret }
      : relations.demandeur_personne_morale;
  return { ...relations, identites, demandeur_personne_morale: demandeur };
}

export function legalSiretError(legalSiret: string): string | null {
  const siret = legalSiret.replaceAll(" ", "");
  if (!siret) return "Renseignez le numéro de SIRET.";
  if (!/^\d{14}$/u.test(siret)) return "Le numéro de SIRET doit contenir 14 chiffres.";
  return null;
}
