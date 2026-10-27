import type { EmailDetail } from "@pitchou/types/adminEmails.ts";
import { environmentLabels, formatDate, reasonLabels } from "../labels.ts";
export function mailMetadata(detail: EmailDetail): [string, string][] {
  const row = detail.row;
  const fields: [string, string][] = [
    ["Identifiant", `${row.source}:${row.id}`],
    ["Environnement", environmentLabels[row.environment] ?? row.environment],
    [
      "Destinataire",
      [row.first_names, row.last_name].filter(Boolean).join(" ") ||
        (row.source === "cnpn" ? "CNPN" : "Nom non renseigné"),
    ],
    ["À", detail.recipients.join(", ") || "Non enregistré"],
    ["Création", formatDate(row.created_at)],
    [row.source === "cnpn" ? "Demande d’envoi" : "Envoi prévu", formatDate(row.due_at)],
    ["Pris en charge par Brevo", formatDate(row.sent_at)],
  ];
  if (row.personne) fields.push(["Personne", `#${row.personne}`]);
  if (detail.cc.length > 0) fields.push(["Copie", detail.cc.join(", ")]);
  if (detail.sentBy) fields.push(["Envoyé par", detail.sentBy]);
  if (detail.firstAttemptAt) fields.push(["Première tentative", formatDate(detail.firstAttemptAt)]);
  if (row.retry_at) fields.push(["Prochaine reprise", formatDate(row.retry_at)]);
  if (row.attempt_count !== null) fields.push(["Tentatives", String(row.attempt_count)]);
  if (row.provider_message_id) fields.push(["Identifiant du prestataire", row.provider_message_id]);
  if (row.last_error) fields.push(["Erreur", reasonLabels[row.last_error] ?? row.last_error]);
  if (row.cancellation_reason)
    fields.push([
      "Motif d’annulation",
      reasonLabels[row.cancellation_reason] ?? row.cancellation_reason,
    ]);
  if (row.source === "cnpn")
    fields.push(
      ["Reçu par le CNPN", formatDate(row.delivered_at)],
      ["Ouverture détectée", formatDate(row.opened_at)],
      ["Accusé de lecture envoyé", formatDate(detail.readReceiptSentAt)],
    );
  return fields;
}
