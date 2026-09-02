import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

export function hasDossierMandataire(dossier: DossierFull): boolean {
  return Boolean(
    dossier.mandataire_last_name || dossier.mandataire_first_names || dossier.mandataire_email,
  );
}

export function entrepriseStatus(dossier: DossierFull): string | null {
  if (dossier.demandeur_personne_morale_admin_status === "Actif") return "En activité";
  if (dossier.demandeur_personne_morale_admin_status === "Ferme") return "Fermé";
  return null;
}

export function entrepriseCreationDate(dossier: DossierFull): string | null {
  const date = dossier.demandeur_personne_morale_creation_date;
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("fr-FR");
}
