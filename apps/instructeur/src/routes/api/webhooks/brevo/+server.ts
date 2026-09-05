import { timingSafeEqual } from "node:crypto";
import { error, type RequestHandler } from "@sveltejs/kit";
import { readJsonObject } from "$lib/server/requestValidation.ts";
import { processDossierCnpnEmailBrevoEvent } from "@pitchou/server/cnpnEmailBrevo.ts";

const eventTypes: Readonly<Record<string, "delivered" | "opened">> = {
  delivered: "delivered",
  unique_opened: "opened",
  opened: "opened",
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireWebhookSecret(request: Request) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected?.trim()) error(503, "Le webhook Brevo n'est pas configuré.");
  const actual = /^Bearer +([a-z0-9._~+/-]+=*)$/i.exec(
    request.headers.get("Authorization") ?? "",
  )?.[1];
  if (!actual) error(401, "Authentification du webhook invalide.");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    error(401, "Authentification du webhook invalide.");
  }
}

export const POST: RequestHandler = async ({ request }) => {
  requireWebhookSecret(request);
  const payload = await readJsonObject(request);
  const type = typeof payload.event === "string" ? eventTypes[payload.event] : undefined;
  if (!type) return new Response(null, { status: 204 });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const messageId = typeof payload["message-id"] === "string" ? payload["message-id"].trim() : "";
  const customId =
    typeof payload["X-Mailin-custom"] === "string" ? payload["X-Mailin-custom"].trim() : "";
  const requestId = UUID_PATTERN.test(customId) ? customId : undefined;
  const timestamp = payload.ts_event;
  if (!email || !messageId || typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    error(400, "Événement Brevo invalide.");
  }
  const occurredAt = new Date(timestamp * 1000);
  if (Number.isNaN(occurredAt.getTime())) error(400, "Date d'événement Brevo invalide.");

  const tags = Array.isArray(payload.tags) ? payload.tags : [];
  let result: "processed" | "retry" | "unmatched";
  try {
    result = await processDossierCnpnEmailBrevoEvent({
      type,
      providerMessageId: messageId,
      requestId,
      recipientEmail: email,
      occurredAt,
    });
  } catch {
    error(429, "Le traitement de l'événement doit être rejoué.");
  }
  if (result === "retry" || (result === "unmatched" && tags.includes("cnpn-saisine"))) {
    error(429, "L'envoi correspondant n'est pas encore disponible.");
  }
  return new Response(null, { status: 204 });
};
