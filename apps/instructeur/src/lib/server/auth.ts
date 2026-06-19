import { error } from "@sveltejs/kit";
import { dossiersAccessibleViaCap } from "@pitchou/server/database/dossier.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { isAdminEmail } from "@pitchou/server/admin.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

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

/**
 * Resolves the `secret` (a personne's code d'accès) to their email and ensures
 * it belongs to an admin. Returns the admin email, or throws a 403/400.
 */
export async function requireAdmin(url: URL): Promise<string> {
  const secret = requireSecret(url);
  const personne = await directDatabaseConnection("personne")
    .select("email")
    .where({ code_accès: secret })
    .first();

  if (!personne || !isAdminEmail(personne.email)) {
    error(403, "Accès réservé aux administrateurs");
  }
  return personne.email;
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
