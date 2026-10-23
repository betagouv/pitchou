import { error } from "@sveltejs/kit";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierAccess } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { Knex } from "knex";

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
  databaseConnection?: Knex,
): Promise<{ dossierId: Dossier["id"]; access: DossierAccess }> {
  if (!dossierId) error(403, "Dossier inaccessible");
  const access = (await dossiersAccessibleToUser(dossierId, userId, databaseConnection)).get(
    dossierId,
  );
  if (!access) error(403, "Dossier inaccessible");
  return { dossierId, access };
}

export async function requireDossierAccess(
  dossierId: Dossier["id"] | undefined,
  userId: UserId,
  databaseConnection?: Knex,
): Promise<Dossier["id"]> {
  const result = await requireDossierAccessLevel(dossierId, userId, databaseConnection);
  if (result.access !== "complet")
    error(403, "Vous disposez uniquement d'un accès en lecture seule à ce dossier");
  return result.dossierId;
}

export async function lockDossierAccess(transaction: Knex.Transaction): Promise<void> {
  // Use the same lock as account, permission and ownership changes. Acquire it
  // after reading the request body, before checking access or taking row locks.
  // Keep it until the mutation and its historique commit together.
  await transaction.raw("select pg_advisory_xact_lock(2105102026)");
}

export async function requireDossierWriteAccess(
  dossierId: Dossier["id"] | undefined,
  userId: UserId,
  transaction: Knex.Transaction,
): Promise<Dossier["id"]> {
  await lockDossierAccess(transaction);
  return requireDossierAccess(dossierId, userId, transaction);
}
