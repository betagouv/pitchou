import { error } from "@sveltejs/kit";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

export function requireUserId(locals: App.Locals): UserId {
  if (!locals.user) error(401, "Authentification requise");
  return locals.user.id;
}

export function requireSecret(url: URL): string {
  const secret = url.searchParams.get("secret");
  if (!secret) error(401, "Identifiant de service manquant");
  return secret;
}

export async function requireDossierAccessLevel(
  dossierId: Dossier["id"] | undefined,
  userId: UserId,
): Promise<{ dossierId: Dossier["id"]; access: DossierAccess }> {
  if (!dossierId) error(403, "Dossier inaccessible");
  const access = (await dossiersAccessibleToUser(dossierId, userId)).get(dossierId);
  if (!access) error(403, "Dossier inaccessible");
  return { dossierId, access };
}

export async function requireDossierAccess(
  dossierId: Dossier["id"] | undefined,
  userId: UserId,
): Promise<Dossier["id"]> {
  const result = await requireDossierAccessLevel(dossierId, userId);
  if (result.access !== "complet")
    error(403, "Vous disposez uniquement d'un accès en lecture seule à ce dossier");
  return result.dossierId;
}
