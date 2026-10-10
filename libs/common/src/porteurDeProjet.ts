import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";

/** Name of the porteur de projet, without its SIRET; null when there is none. */
export function porteurDeProjetName(porteur: PorteurDeProjet | null | undefined): string | null {
  if (porteur?.type === "personne_morale") return porteur.legal_name || null;
  if (porteur?.type === "personne_physique") {
    return [porteur.last_name, porteur.first_names].filter(Boolean).join(" ") || null;
  }
  return null;
}
