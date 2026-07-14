import type { DossierResume, DossierComplet } from "@pitchou/types/API_Pitchou.ts";

export { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
export { formatDateAbsolue, formatDateRelative } from "@pitchou/common/formatDate.ts";

export function formatLocalisation({
  communes,
  départements,
  régions,
}: Partial<DossierComplet>): string {
  // Clean up the case where a dossier said it spanned several communes, but the communes were not entered
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

export function formatDeposant(dossier: DossierComplet | DossierResume): string {
  const INCONNU = "(inconnu)";

  let { déposant_nom: deposant_nom, déposant_prénoms: deposant_prenoms } = dossier;

  if (!deposant_nom && !deposant_prenoms) {
    if ("déposant_email" in dossier) {
      return dossier.déposant_email ?? INCONNU;
    }
    return INCONNU;
  }
  if (!deposant_nom) {
    deposant_nom = "";
  }
  if (!deposant_prenoms) {
    deposant_prenoms = "";
  }

  return deposant_nom ? deposant_nom + " " + deposant_prenoms : deposant_prenoms;
}

export function formatPorteurDeProjet(dossier: DossierComplet | DossierResume): string {
  if (dossier.demandeur_personne_morale_siret) {
    return `${dossier.demandeur_personne_morale_raison_sociale} (${dossier.demandeur_personne_morale_siret})`;
  } else {
    if (dossier.demandeur_personne_physique_nom) {
      return (
        dossier.demandeur_personne_physique_nom + " " + dossier.demandeur_personne_physique_prénoms
      );
    } else {
      return formatDeposant(dossier);
    }
  }
}
