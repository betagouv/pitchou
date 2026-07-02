import type { DossierRésumé, DossierComplet } from "@pitchou/types/API_Pitchou.ts";

export { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
export { formatDateAbsolue, formatDateRelative } from "@pitchou/common/formatDate.ts";

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

export function formatDéposant(dossier: DossierComplet | DossierRésumé): string {
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
