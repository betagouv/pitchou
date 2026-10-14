import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { emailNotificationPreferencesFromCap } from "@pitchou/server/database/email_notification_preferences.ts";

export const GET: RequestHandler = async ({ url }) => {
  const preferences = await emailNotificationPreferencesFromCap(requireCap(url));
  if (!preferences) error(403, "Capability invalide");
  return json(preferences);
};

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["assignment", "novelty"]));
  if (typeof body.assignment !== "boolean" || typeof body.novelty !== "boolean") {
    error(400, "Les deux préférences doivent être des booléens.");
  }
  const preferences = await emailNotificationPreferencesFromCap(cap, {
    assignment: body.assignment,
    novelty: body.novelty,
  });
  if (!preferences) error(403, "Capability invalide");
  return json(preferences);
};
