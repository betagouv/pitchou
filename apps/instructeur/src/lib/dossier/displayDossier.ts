import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import type { DossierSummary, DossierFull } from "@pitchou/types/API_Pitchou.ts";

export { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
export { formatDateAbsolute, formatDateRelative } from "@pitchou/common/formatDate.ts";
export { porteurDeProjetName } from "@pitchou/common/porteurDeProjet.ts";
import { porteurDeProjetName } from "@pitchou/common/porteurDeProjet.ts";

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

/** What the searches match a porteur de projet on: its name, and its SIRET for an entreprise. */
export function porteurDeProjetSearchTerms(porteur: DossierSummary["porteur_de_projet"]): string[] {
  if (porteur?.type === "personne_morale")
    return [porteur.legal_name, porteur.siret].filter(Boolean) as string[];
  if (porteur?.type === "personne_physique")
    return [porteur.last_name, porteur.first_names].filter(Boolean) as string[];
  return [];
}

export function formatPorteurDeProjet(dossier: DossierFull | DossierSummary): string {
  const porteur = dossier.porteur_de_projet;
  if (porteur?.type === "personne_morale") {
    return porteur.legal_name
      ? `${porteur.legal_name} (${porteur.siret})`
      : `SIRET ${porteur.siret}`;
  }
  return porteurDeProjetName(porteur) ?? "Non renseigné";
}
