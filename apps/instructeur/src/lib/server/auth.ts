import { error } from "@sveltejs/kit";
import { dossiersAccessibleViaCap } from "@pitchou/server/database/dossier.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

export function requireCap(url: URL): CapDossierCap {
  const cap = url.searchParams.get("cap");
  if (!cap) {
    error(400, "Paramètre 'cap' manquant dans l'URL");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cap)) {
    error(403, "Capability invalide");
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
 * Resolves what a cap may do with a dossier, or refuses if it cannot reach it.
 *
 * Use this when the endpoint serves a read-only viewer too. Writes and endpoints
 * exposing internal instruction data, such as historique and commentaires,
 * require `requireDossierAccessByCap` instead.
 */
export async function requireDossierAccessLevelByCap(
  dossierId: Dossier["id"] | undefined,
  cap: CapDossierCap,
): Promise<{ dossierId: Dossier["id"]; access: DossierAccess }> {
  if (!dossierId) {
    error(403, "Cap insuffisante ou entité introuvable");
  }
  const access = (await dossiersAccessibleViaCap(dossierId, cap)).get(dossierId);
  if (!access) {
    error(403, `La capability ne permet pas d'accéder au dossier ${dossierId}`);
  }
  return { dossierId, access };
}

/**
 * Requires full access through the service instructing the dossier.
 * Other services have read-only access and cannot use these endpoints.
 */
export async function requireDossierAccessByCap(
  dossierId: Dossier["id"] | undefined,
  cap: CapDossierCap,
): Promise<Dossier["id"]> {
  const { access } = await requireDossierAccessLevelByCap(dossierId, cap);
  if (access !== "complet") {
    error(
      403,
      `Votre service dispose uniquement d'un accès en lecture seule au dossier ${dossierId}`,
    );
  }
  return dossierId as Dossier["id"];
}
