import { error } from "@sveltejs/kit";
import type { GroupUpdate, UserUpdate } from "@pitchou/server/administration.ts";
import { DEPARTEMENT_VALUES } from "./dossierValidation/columnAcceptedValues.ts";

function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
    error(400, "Liste invalide");
  return [...new Set(value)] as string[];
}
export function parseUser(body: Record<string, unknown>): UserUpdate {
  if (!body || typeof body !== "object" || Array.isArray(body)) error(400, "Utilisateur invalide");
  if (typeof body.email !== "string" || typeof body.active !== "boolean")
    error(400, "Utilisateur invalide");
  if (body.id !== undefined && (!Number.isSafeInteger(body.id) || Number(body.id) < 1))
    error(400, "Identifiant invalide");
  const groupIds = body.groupIds === undefined ? undefined : strings(body.groupIds);
  if (
    groupIds?.some(
      (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    )
  )
    error(400, "Identifiant de groupe invalide");
  return {
    id: body.id as number | undefined,
    email: body.email,
    active: body.active,
    bundles: strings(body.bundles),
    grants: strings(body.grants),
    exclusions: strings(body.exclusions),
    ...(groupIds === undefined ? {} : { groupIds }),
  };
}
export function parseGroup(body: Record<string, unknown>): GroupUpdate {
  if (!body || typeof body !== "object" || Array.isArray(body)) error(400, "Groupe invalide");
  if (typeof body.name !== "string" || body.name.length > 200 || typeof body.active !== "boolean")
    error(400, "Groupe invalide");
  if (
    body.id !== undefined &&
    (typeof body.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id))
  )
    error(400, "Identifiant invalide");
  const departments = strings(body.departments);
  if (departments.some((d) => !DEPARTEMENT_VALUES.has(d))) error(400, "Département inconnu");
  if (
    !Array.isArray(body.members) ||
    body.members.some((id) => !Number.isSafeInteger(id) || Number(id) < 1)
  )
    error(400, "Membre invalide");
  return {
    id: body.id as string | undefined,
    name: body.name,
    active: body.active,
    departments,
    members: body.members as number[],
  };
}
export async function saveAdministration<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (cause) {
    if (cause instanceof TypeError) error(400, cause.message);
    if (
      typeof cause === "object" &&
      cause &&
      "code" in cause &&
      ["23505", "23503"].includes(String(cause.code))
    )
      error(409, "Ce compte existe déjà ou une référence a changé. Actualisez la page.");
    throw cause;
  }
}
