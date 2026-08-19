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
 * Use this when the endpoint serves a read-only viewer too; anything that writes
 * — or that exposes the instruction itself, like the historique and the
 * commentaires — wants `requireDossierAccessByCap` instead.
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
 * Requires full access to the dossier — the default for every endpoint, so that
 * a dossier merely shared with a groupe stays untouchable unless the endpoint
 * deliberately opts into read access.
 */
export async function requireDossierAccessByCap(
  dossierId: Dossier["id"] | undefined,
  cap: CapDossierCap,
): Promise<Dossier["id"]> {
  const { access } = await requireDossierAccessLevelByCap(dossierId, cap);
  if (access !== "complet") {
    error(403, `Le dossier ${dossierId} est partagé en lecture seule avec votre service`);
  }
  return dossierId as Dossier["id"];
}
