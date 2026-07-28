import { error } from "@sveltejs/kit";

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    error(400, "Corps JSON invalide.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    error(400, "Le corps de la requête doit être un objet JSON.");
  }

  return value as Record<string, unknown>;
}

export function rejectUnknownProperties(
  value: Record<string, unknown>,
  allowedProperties: ReadonlySet<string>,
): void {
  const unknownProperty = Object.keys(value).find((property) => !allowedProperties.has(property));
  if (unknownProperty) {
    error(400, `Propriété non reconnue '${unknownProperty}'.`);
  }
}
