import { timingSafeEqual } from "node:crypto";
import { error, type RequestHandler } from "@sveltejs/kit";
import { readJsonObject } from "$lib/server/requestValidation.ts";
import { recordDossierCnpnEmailBrevoEvent } from "@pitchou/server/database/dossier_cnpn_email.ts";

const eventTypes: Readonly<Record<string, "delivered" | "opened">> = {
  delivered: "delivered",
  unique_opened: "opened",
  opened: "opened",
};

function requireWebhookSecret(url: URL) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) error(503, "Le webhook Brevo n'est pas configuré.");
  const actual = url.searchParams.get("secret") ?? "";
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    error(401, "Secret de webhook invalide.");
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  requireWebhookSecret(url);
  const payload = await readJsonObject(request);
  const type = typeof payload.event === "string" ? eventTypes[payload.event] : undefined;
  if (!type) return new Response(null, { status: 204 });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const messageId = typeof payload["message-id"] === "string" ? payload["message-id"].trim() : "";
  const timestamp = payload.ts_event;
  if (!email || !messageId || typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    error(400, "Événement Brevo invalide.");
  }
  const occurredAt = new Date(timestamp * 1000);
  if (Number.isNaN(occurredAt.getTime())) error(400, "Date d'événement Brevo invalide.");

  await recordDossierCnpnEmailBrevoEvent({
    type,
    providerMessageId: messageId,
    recipientEmail: email,
    occurredAt,
  });
  return new Response(null, { status: 204 });
};
