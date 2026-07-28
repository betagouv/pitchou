import { error } from "@sveltejs/kit";

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    error(400, "Invalid JSON body.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    error(400, "The request body must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function rejectUnknownProperties(
  value: Record<string, unknown>,
  allowedProperties: ReadonlySet<string>,
): void {
  const unknownProperty = Object.keys(value).find((property) => !allowedProperties.has(property));
  if (unknownProperty) {
    error(400, `Unknown property '${unknownProperty}'.`);
  }
}
