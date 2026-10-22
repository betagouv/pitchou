import type { EmailMessage } from "../emails.ts";
import { notificationEmailHtml } from "./layout.ts";

export function notificationEmailMessage(
  context: {
    id: string;
    kind: "assignment" | "novelty" | "arrival";
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
  const settingsUrl = new URL("/parametres/notifications", siteUrl).href;
  const logoUrl = new URL("/images/pitchou-logo-email.png", siteUrl).href;
  const title =
    context.kind === "arrival"
      ? "Nouveau dossier"
      : context.kind === "assignment"
        ? "Attribution de dossier"
        : "Nouveautés sur votre dossier";
  const subject =
    context.kind === "arrival"
      ? `Nouveau dossier: ${label}`
      : `${context.kind === "assignment" ? "Attribution dossier" : "Nouveauté"}: ${number} - ${enjeu} - ${context.name ?? "Dossier sans titre"}`;
  const introduction =
    context.kind === "arrival"
      ? "Un nouveau dossier vient d’arriver dans Pitchou et attend d'être suivi par un-e instructeur-trice:"
      : context.kind === "assignment"
        ? "Le dossier suivant vous a été attribué pour suivi dans Pitchou:"
        : "Il y a du nouveau sur votre dossier:";
  return {
    to: [context.email],
    subject,
    htmlContent: notificationEmailHtml({
      title,
      introduction,
      label,
      dossierUrl,
      settingsUrl,
      logoUrl,
    }),
    tags: [`dossier-${context.kind}`],
    headers: { idempotencyKey: context.id },
  };
}
