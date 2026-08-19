import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import type { DossierSummary, DossierFull } from "@pitchou/types/API_Pitchou.ts";

export {
  phases,
  prochaineActionAttenduePar,
  prochainesActionsAttenduesParEntite,
} from "@pitchou/common/phases.ts";
export { formatDateAbsolute, formatDateRelative } from "@pitchou/common/formatDate.ts";

/**
 * Badge of a dossier changed since the instructeur last read it: « Modifié hier »,
 * « Modifié il y a 3 jours ». Counted in calendar days, so a change made yesterday
 * evening still reads « hier » this morning. Beyond a month the exact number of
 * days stops meaning anything, so the wording widens.
 */
export function formatLastModified(date: Date | string | null | undefined): string {
  if (!date) return "Nouveauté";
  const modifiedAt = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(modifiedAt.getTime())) return "Nouveauté";

  const days = differenceInCalendarDays(new Date(), modifiedAt);
  if (days <= 0) return "Modifié aujourd'hui";
  if (days === 1) return "Modifié hier";
  if (days < 30) return `Modifié il y a ${days} jours`;
  return `Modifié ${formatDistanceToNow(modifiedAt, { addSuffix: true, locale: fr })}`;
}

export function formatLocalisation({
  communes,
  departments,
  regions,
  location_scope: locationScope,
  primary_department: primaryDepartment,
}: Partial<DossierFull>): string {
  communes = communes?.length ? communes : undefined;
  departments = departments?.length ? departments : undefined;
  regions = regions?.length ? regions : undefined;

  if (locationScope === "france") return "France entière";
  if (locationScope === "regions" && regions) return `Régions: ${regions.join(", ")}`;
  if (locationScope === "departements" && departments) return departments.join(", ");

  if (communes) {
    const names = communes.map(({ name }) => name).join(", ");
    return departments ? `${names} (${departments.join(", ")})` : names;
  }

  // Legacy dossiers have no location_scope, so retain the former data-driven fallbacks.
  if (departments) return departments.join(", ");
  if (regions) return `Régions: ${regions.join(", ")}`;
  if (primaryDepartment) return primaryDepartment;
  return "(inconnue)";
}

export function formatDeposant(dossier: DossierFull | DossierSummary): string {
  const UNKNOWN = "(inconnu)";

  let { deposant_last_name, deposant_first_names } = dossier;

  if (!deposant_last_name && !deposant_first_names) {
    if ("deposant_email" in dossier) {
      return dossier.deposant_email ?? UNKNOWN;
    }
    return UNKNOWN;
  }
  if (!deposant_last_name) {
    deposant_last_name = "";
  }
  if (!deposant_first_names) {
    deposant_first_names = "";
  }

  return deposant_last_name
    ? deposant_last_name + " " + deposant_first_names
    : deposant_first_names;
}

export function formatPorteurDeProjet(dossier: DossierFull | DossierSummary): string {
  if (dossier.demandeur_personne_morale_siret) {
    return dossier.demandeur_personne_morale_legal_name
      ? `${dossier.demandeur_personne_morale_legal_name} (${dossier.demandeur_personne_morale_siret})`
      : `SIRET ${dossier.demandeur_personne_morale_siret}`;
  } else {
    if (dossier.demandeur_personne_physique_last_name) {
      return (
        dossier.demandeur_personne_physique_last_name +
        " " +
        dossier.demandeur_personne_physique_first_names
      );
    } else {
      return formatDeposant(dossier);
    }
  }
}

// "Nom Prénom" from a last/first name pair, ignoring missing parts.
function formatName(
  lastName: string | null | undefined,
  firstNames: string | null | undefined,
): string {
  return [lastName, firstNames].filter(Boolean).join(" ");
}

export function hasMandataire(dossier: DossierFull): boolean {
  return Boolean(dossier.mandataire_last_name || dossier.mandataire_first_names);
}

export function formatMandataire(dossier: DossierFull): string {
  return formatName(dossier.mandataire_last_name, dossier.mandataire_first_names) || "(inconnu)";
}

// The human contact behind the demandeur: for a personne morale the demandeur is the
// company itself, so its human contact is the legal representative (représentant);
// for a personne physique it is that person.
export function formatDemandeurContact(dossier: DossierFull): string {
  if (dossier.demandeur_personne_morale_siret) {
    return (
      formatName(dossier.representative_last_name, dossier.representative_first_names) ||
      dossier.demandeur_personne_morale_legal_name ||
      "(inconnu)"
    );
  }
  return (
    formatName(
      dossier.demandeur_personne_physique_last_name,
      dossier.demandeur_personne_physique_first_names,
    ) || "(inconnu)"
  );
}
