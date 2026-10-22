import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "#lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import { emailNotificationPreferencesForUser } from "@pitchou/server/database/email_notification_preferences.ts";

export const GET: RequestHandler = async ({ locals }) => {
  const preferences = await emailNotificationPreferencesForUser(requireUserId(locals));
  if (!preferences) error(403, "Compte introuvable");
  return json(preferences);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["assignment", "novelty", "arrival"]));
  if (
    typeof body.assignment !== "boolean" ||
    typeof body.novelty !== "boolean" ||
    typeof body.arrival !== "boolean"
  ) {
    error(400, "Les trois préférences doivent être des booléens.");
  }
  const preferences = await emailNotificationPreferencesForUser(userId, {
    assignment: body.assignment,
    novelty: body.novelty,
    arrival: body.arrival,
  });
  if (!preferences) error(403, "Compte introuvable");
  return json(preferences);
};
