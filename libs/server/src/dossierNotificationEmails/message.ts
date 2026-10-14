import type { EmailMessage } from "../emails.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function notificationEmailMessage(
  context: {
    id: string;
    kind: "assignment" | "novelty";
    email: string;
    dossier: number;
    demarche_numerique_number: number | null;
    name: string | null;
    enjeu: boolean | null;
  },
  siteUrl: string,
): EmailMessage {
  const number = context.demarche_numerique_number ?? context.dossier;
  const enjeu =
    context.enjeu === null ? "Enjeu à déterminer" : context.enjeu ? "À enjeu" : "Sans enjeu";
  const label = `${number} - ${context.name ?? "Dossier sans titre"}`;
  const dossierUrl = new URL(`/dossier/${context.dossier}`, siteUrl).href;
  const settingsUrl = new URL("/parametres", siteUrl).href;
  return {
    to: [context.email],
    subject: `${context.kind === "assignment" ? "Attribution dossier" : "Nouveauté"}: ${number} - ${enjeu} - ${context.name ?? "Dossier sans titre"}`,
    htmlContent: `<p>Bonjour,</p><p>${context.kind === "assignment" ? "Le dossier suivant vous a été attribué pour suivi dans Pitchou:" : "Il y a du nouveau sur votre dossier:"}</p><p><a href="${escapeHtml(dossierUrl)}">${escapeHtml(label)}</a></p><p>Vous pouvez <a href="${escapeHtml(settingsUrl)}">paramétrer les mails de notifications automatiques dans votre espace</a>.</p>`,
    tags: [`dossier-${context.kind}`],
    headers: { idempotencyKey: context.id },
  };
}
