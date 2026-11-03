import { createHash } from "node:crypto";
import { isBrevoDuplicateIdempotencyError, sendEmail } from "../emails.ts";

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function sendCnpnEmailDeliveryFailure(
  to: string,
  context: { eventId: string; dossierId: number; subject: string; reason: string },
) {
  const hash = createHash("sha256")
    .update(`cnpn-delivery-failure:${context.eventId}`)
    .digest("hex");
  const idempotencyKey = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  try {
    return await sendEmail({
      to: [to],
      subject: `Échec de livraison de votre saisine CNPN - dossier ${context.dossierId}`,
      htmlContent: `<p>Brevo signale un échec de livraison de votre mail de saisine au CNPN pour le dossier ${context.dossierId}.</p><p><strong>Objet :</strong> ${escapeHtml(context.subject)}</p><p><strong>Motif :</strong> ${escapeHtml(context.reason)}</p><p>Consultez le suivi du dossier dans Pitchou. Si le message est trop volumineux, réduisez les pièces jointes ou remplacez-les par un lien de téléchargement accessible au CNPN avant de procéder à un nouvel envoi.</p>`,
      tags: ["cnpn-delivery-failure"],
      headers: { idempotencyKey },
    });
  } catch (error) {
    if (await isBrevoDuplicateIdempotencyError(error)) return { messageId: context.eventId };
    throw error;
  }
}
