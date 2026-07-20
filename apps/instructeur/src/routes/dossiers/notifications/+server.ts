import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  getNotificationsForPersonneFromCap,
  updateNotificationDossierFromCap,
} from "@pitchou/server/database/notification.ts";
import type Notification from "@pitchou/types/database/public/Notification.ts";

const notificationUpdateProperties = new Set(["dossier", "viewed"]);

function parseNotificationUpdate(
  value: Record<string, unknown>,
): Pick<Notification, "dossier" | "viewed"> {
  rejectUnknownProperties(value, notificationUpdateProperties);

  if (typeof value.dossier !== "number" || !Number.isInteger(value.dossier)) {
    error(400, `La propriété 'dossier' doit être un nombre entier.`);
  }
  if (typeof value.viewed !== "boolean") {
    error(400, `La propriété 'viewed' doit être un booléen.`);
  }

  return value as Pick<Notification, "dossier" | "viewed">;
}

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  return json(await getNotificationsForPersonneFromCap(cap));
};

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const notification = parseNotificationUpdate(await readJsonObject(request));
  await updateNotificationDossierFromCap(cap, notification);
  return new Response(null, { status: 204 });
};
