import { differenceInDays, format, formatRelative } from "date-fns";
import { fr } from "date-fns/locale";

import type { DossierRésumé, DossierComplet } from "../types/API_Pitchou.ts";

export { phases, prochaineActionAttenduePar } from "../commun/phases.ts";

export function formatLocalisation({
  communes,
  départements,
  régions,
}: Partial<DossierComplet>): string {
  // Nettoyage du cas où un dossier a dit qu'il était sur plusieurs communes, mais n'a pas saisi les communes
  if (Array.isArray(communes) && communes.length === 0) {
    communes = undefined;
  }

  // Régions
  if (!communes && !départements && régions) {
    return `Régions: ${régions.join(", ")}`;
  }

  // Départements
  if (!communes && départements) {
    return départements.join(", ");
  }

  // Communes
  if (
    !communes ||
    (!communes && !départements) ||
    (communes &&
      Array.isArray(communes) &&
      communes.length === 0 &&
      (!départements || départements.length === 0))
  ) {
    return "(inconnue)";
  }

  return (
    communes.map(({ name }) => name).join(", ") +
    " " +
    `(${Array.isArray(départements) ? départements.join(", ") : ""})`
  );
}

function formatDéposant(dossier: DossierComplet | DossierRésumé): string {
  const INCONNU = "(inconnu)";

  let { déposant_nom, déposant_prénoms } = dossier;

  if (!déposant_nom && !déposant_prénoms) {
    if ("déposant_email" in dossier) {
      return dossier.déposant_email ?? INCONNU;
    }
    return INCONNU;
  }
  if (!déposant_nom) {
    déposant_nom = "";
  }
  if (!déposant_prénoms) {
    déposant_prénoms = "";
  }

  return déposant_nom ? déposant_nom + " " + déposant_prénoms : déposant_prénoms;
}

export function formatPorteurDeProjet(dossier: DossierComplet | DossierRésumé): string {
  if (dossier.demandeur_personne_morale_siret) {
    return `${dossier.demandeur_personne_morale_raison_sociale} (${dossier.demandeur_personne_morale_siret})`;
  } else {
    if (dossier.demandeur_personne_physique_nom) {
      return (
        dossier.demandeur_personne_physique_nom + " " + dossier.demandeur_personne_physique_prénoms
      );
    } else {
      return formatDéposant(dossier);
    }
  }
}

/**
 * Formate une date JavaScript selon un format spécifié, en utilisant la locale française.
 *
 * Si la date est `null` ou `undefined`, la fonction retourne la chaîne "(date inconnue)".
 * Par défaut, le format demandé est : 'd MMMM yyyy'
 */
export function formatDateAbsolue(
  date: Date | string | undefined | null,
  formatDemandé: string = "d MMMM yyyy",
): string {
  if (!date) {
    return "(date inconnue)";
  }

  return format(date, formatDemandé, { locale: fr });
}

export function formatDateRelative(date: Date | undefined | null): string {
  if (!date) {
    return "(date inconnue)";
  }

  if (differenceInDays(date, new Date()) === 0) {
    return `Aujourd'hui`;
  }
  if (Math.abs(differenceInDays(date, new Date())) <= 7) {
    return formatRelative(date, new Date(), { locale: fr });
  }

  return formatDateAbsolue(date);
}
