import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";

/** Name of the porteur de projet, without its SIRET; null when there is none. */
export function porteurDeProjetName(porteur: PorteurDeProjet | null | undefined): string | null {
  if (porteur?.type === "organisation") return porteur.name;
  if (porteur?.type === "personne_morale") return porteur.legal_name || null;
  if (porteur?.type === "personne_physique") {
    return [porteur.last_name, porteur.first_names].filter(Boolean).join(" ") || null;
  }
  return null;
}

export function organisationSourceName(source: string): string {
  const names: Record<string, string> = {
    onagre: "Onagre",
    pitchou: "Pitchou",
    demarche_numerique: "Démarches Numériques",
  };
  return names[source] ?? source;
}

export function organisationStatusLabel(
  porteur: Extract<PorteurDeProjet, { type: "organisation" }>,
): string {
  return porteur.verification_status === "verified"
    ? "Organisation vérifiée — établissement à confirmer"
    : `Organisation déclarée dans ${organisationSourceName(porteur.source)} — à vérifier`;
}

export function organisationUncertaintyLabel(
  porteur: PorteurDeProjet | null | undefined,
): string | null {
  if (porteur?.type !== "organisation") return null;
  return porteur.verification_status === "verified" ? "Établissement à confirmer" : "À vérifier";
}
