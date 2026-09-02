import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import type {
  DossierSearchEventDetails,
  EvenementAddPieceJointeDetails,
  EvenementAssignDossierFollowersDetails,
  EvenementClickNavbarLinkDetails,
  EvenementOpenModalAddPieceJointeDetails,
  EvenementPartagerDossierDetails,
} from "@pitchou/types/evenement.d.ts";

export function isDossierDetails(details: any): details is { dossierId: number } {
  return Object(details) === details && Number.isInteger(details.dossierId);
}

export function isAssignDossierFollowersDetails(
  details: any,
): details is EvenementAssignDossierFollowersDetails {
  if (Object(details) !== details) return false;
  const added = details.addedPersonneEmails;
  const removed = details.removedPersonneEmails;
  if (
    !Number.isInteger(details.dossierId) ||
    !Number.isInteger(details.followerCount) ||
    details.followerCount < 0 ||
    !Array.isArray(added) ||
    !Array.isArray(removed) ||
    !added.every((email: unknown) => Boolean(typeof email === "string" && email)) ||
    !removed.every((email: unknown) => Boolean(typeof email === "string" && email))
  )
    return false;
  const addedSet = new Set(added);
  const removedSet = new Set(removed);
  return (
    addedSet.size === added.length &&
    removedSet.size === removed.length &&
    [...addedSet].every((email) => !removedSet.has(email))
  );
}

export function isPartagerDossierDetails(details: any): details is EvenementPartagerDossierDetails {
  if (Object(details) !== details) return false;
  const added = details.addedGroupes;
  const removed = details.removedGroupes;
  return Boolean(
    Number.isInteger(details.dossierId) &&
    Number.isInteger(details.groupeCount) &&
    details.groupeCount >= 0 &&
    Array.isArray(added) &&
    Array.isArray(removed) &&
    // A groupe cannot be both added to and removed from the same share.
    added.every((groupe: unknown) => typeof groupe === "string" && groupe) &&
    removed.every((groupe: unknown) => typeof groupe === "string" && groupe) &&
    !added.some((groupe: string) => removed.includes(groupe)),
  );
}

export function isSearchDossierDetails(details: any): details is DossierSearchEventDetails {
  if (Object(details) !== details || typeof details.resultCount !== "number" || !details.filters)
    return false;
  const filters = details.filters;
  if (filters.followedBy) {
    const followedBy = filters.followedBy;
    if (
      typeof followedBy.selectedCount !== "number" ||
      typeof followedBy.totalCount !== "number" ||
      typeof followedBy.includesSelf !== "boolean"
    )
      return false;
  }
  if (filters.withoutInstructeur !== undefined && typeof filters.withoutInstructeur !== "boolean")
    return false;
  if (filters.text !== undefined && typeof filters.text !== "string") return false;
  if (
    filters.activitesPrincipales &&
    Array.isArray(filters.activitesPrincipales) &&
    !filters.activitesPrincipales.every((value: any) => typeof value === "string")
  )
    return false;
  if (
    filters.phases &&
    Array.isArray(filters.phases) &&
    !filters.phases.every((value: any) => phases.has(value))
  )
    return false;
  if (
    filters.nextActionExpectedFrom &&
    Array.isArray(filters.nextActionExpectedFrom) &&
    !filters.nextActionExpectedFrom.every(
      (value: any) => value === "(vide)" || prochaineActionAttenduePar.has(value),
    )
  )
    return false;
  return true;
}

const modalSources = new Set([
  "enteteDossier",
  "ongletPiecesJointes",
  "ongletAvis",
  "ongletControles",
  "ongletInstruction",
]);
const pieceJointeTypes = new Set([
  "Décision administrative",
  "Avis expert",
  "Saisine expert",
  "Autre",
]);
const navbarLinks = new Set([
  "mes-dossiers",
  "tous-les-dossiers",
  "tableau-de-suivi",
  "saisie-especes",
  "preremplissage-derogation",
  "aide-pitchou",
]);

export function isOpenModalAddPieceJointeDetails(
  details: any,
): details is EvenementOpenModalAddPieceJointeDetails {
  return (
    Object(details) === details &&
    Number.isInteger(details.dossierId) &&
    modalSources.has(details.source)
  );
}

export function isAddPieceJointeDetails(details: any): details is EvenementAddPieceJointeDetails {
  return (
    Object(details) === details &&
    Number.isInteger(details.dossierId) &&
    modalSources.has(details.source) &&
    pieceJointeTypes.has(details.typePieceJointe) &&
    Number.isInteger(details.nombreFichiers) &&
    details.nombreFichiers > 0
  );
}

export function isClickNavbarLinkDetails(details: any): details is EvenementClickNavbarLinkDetails {
  return Object(details) === details && navbarLinks.has(details.link);
}
