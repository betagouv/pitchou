import { error } from "@sveltejs/kit";
import { dossiersAccessibleViaCap } from "$server/database/dossier.ts";
import type Dossier from "$types/database/public/Dossier.ts";
import type { CapDossierCap } from "$types/database/public/CapDossier.ts";

export function requireCap(url: URL): CapDossierCap {
  const cap = url.searchParams.get("cap");
  if (!cap) {
    error(400, "Paramètre 'cap' manquant dans l'URL");
  }
  return cap as CapDossierCap;
}

export function requireSecret(url: URL): string {
  const secret = url.searchParams.get("secret");
  if (!secret) {
    error(400, "Paramètre 'secret' manquant dans l'URL");
  }
  return secret;
}

export async function requireDossierAccessByCap(
  dossierId: Dossier["id"] | undefined,
  cap: CapDossierCap,
): Promise<Dossier["id"]> {
  if (!dossierId) {
    error(403, "Cap insuffisante ou entité introuvable");
  }
  const accessible = await dossiersAccessibleViaCap(dossierId, cap);
  if (!accessible.has(dossierId)) {
    error(403, `La capability ne permet pas d'accéder au dossier ${dossierId}`);
  }
  return dossierId;
}
