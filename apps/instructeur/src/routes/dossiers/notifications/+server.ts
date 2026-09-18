import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  getNotificationsForPersonneFromCap,
  updateNotificationDossierFromCap,
} from "@pitchou/server/database/notification.ts";
import type { NotificationUpdate } from "@pitchou/types/notification.ts";

const notificationUpdateProperties = new Set(["dossier", "arrival", "followRevision", "revisions"]);

function parseNotificationUpdate(value: Record<string, unknown>): NotificationUpdate {
  rejectUnknownProperties(value, notificationUpdateProperties);

  if (typeof value.dossier !== "number" || !Number.isInteger(value.dossier)) {
    error(400, `La propriété 'dossier' doit être un nombre entier.`);
  }
  if (value.arrival !== undefined && value.arrival !== true) {
    error(400, "La propriété 'arrival' doit valoir true.");
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    value.followRevision !== undefined &&
    (typeof value.followRevision !== "string" || !uuid.test(value.followRevision))
  ) {
    error(400, "Révision de suivi invalide.");
  }
  if (
    value.revisions !== undefined &&
    (!Array.isArray(value.revisions) ||
      value.revisions.length > 1000 ||
      !value.revisions.every((id) => typeof id === "string" && uuid.test(id)))
  ) {
    error(400, "Révisions de champs invalides.");
  }
  if (
    !value.arrival &&
    !value.followRevision &&
    !(Array.isArray(value.revisions) && value.revisions.length)
  ) {
    error(400, "Aucune notification à valider.");
  }
  return value as NotificationUpdate;
}

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  return json(await getNotificationsForPersonneFromCap(cap));
};

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const notification = parseNotificationUpdate(await readJsonObject(request));
  // The update upserts, so an unchecked dossier id would create a notification
  // row for a dossier the cap cannot reach.
  await requireDossierAccessByCap(notification.dossier, cap);
  return json(await updateNotificationDossierFromCap(cap, notification));
};
