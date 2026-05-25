import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import {
  getNotificationsPourPersonneDepuisCap,
  updateNotificationDossierFromCap,
} from "$server/database/notification.ts";
import type { NotificationInitializer } from "$types/database/public/Notification.ts";

export const GET: RequestHandler = async ({ url }) => {
  const cap = requireCap(url);
  return json(await getNotificationsPourPersonneDepuisCap(cap));
};

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const notification = (await request.json()) as NotificationInitializer;
  await updateNotificationDossierFromCap(cap, notification);
  return new Response(null, { status: 204 });
};
